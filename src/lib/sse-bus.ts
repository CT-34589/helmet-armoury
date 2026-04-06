/**
 * Shared SSE bus — one polling interval per worker process, regardless of
 * how many clients are connected. Eliminates per-connection DB polls.
 *
 * Art team stream:  2 lightweight queries per tick (findFirst + count)
 * User streams:     1 groupBy query per tick covering ALL connected users,
 *                   then full fetch only for users whose data actually changed
 *
 * Redis pub/sub propagates change events instantly across all PM2 workers so
 * clients see updates immediately rather than waiting for the next poll tick.
 * Falls back to polling-only if REDIS_URL is not set.
 */

import { prisma } from "./prisma"
import { getItemLabelMap, resolveLabels } from "./label-lookup"
import { redisPub, redisSub } from "./redis"

type Sender = (data: unknown) => void

// ─── Art team subscribers ──────────────────────────────────────────────────

const artTeamSenders = new Set<Sender>()
let artTeamLastTs = ""
let artTeamLastCount = -1

const ACTIVE_STATUSES = ["PENDING", "ACCEPTED", "IN_PROGRESS"] as const

export async function fetchActiveRequests() {
  const labelMap = await getItemLabelMap()
  const rows = await prisma.request.findMany({
    where: { status: { in: [...ACTIVE_STATUSES] } },
    include: {
      user: { select: { id: true, name: true, image: true } },
      artist: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  })
  return rows.map((r) => ({
    ...r,
    decals: resolveLabels(JSON.parse(r.decals) as string[], labelMap),
    designs: resolveLabels(JSON.parse(r.designs) as string[], labelMap),
    visorColour: r.visorColour ? (labelMap[r.visorColour] ?? r.visorColour) : null,
    attachments: resolveLabels(JSON.parse(r.attachments ?? "[]") as string[], labelMap),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))
}

// ─── User subscribers ──────────────────────────────────────────────────────

const userSenders = new Map<string, Set<Sender>>()
const userLastTs = new Map<string, string>()

export async function fetchUserData(userId: string) {
  const labelMap = await getItemLabelMap()
  const rows = await prisma.request.findMany({
    where: { userId },
    include: { artist: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  const active = rows
    .filter((r) => !["COMPLETED", "DECLINED"].includes(r.status))
    .map((r) => ({
      id: r.id,
      helmetType: labelMap[r.helmetType] ?? r.helmetType,
      status: r.status,
      artistName: r.artist?.name ?? null,
      declineReason: r.declineReason ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))

  const completed = rows
    .filter((r) => r.status === "COMPLETED")
    .map((r) => ({
      id: r.id,
      helmetType: labelMap[r.helmetType] ?? r.helmetType,
      artistName: r.artist?.name ?? null,
      completedImageUrl: r.completedImageUrl,
      createdAt: r.createdAt.toISOString(),
      decals: resolveLabels(JSON.parse(r.decals) as string[], labelMap),
      designs: resolveLabels(JSON.parse(r.designs) as string[], labelMap),
      visorColour: r.visorColour ? (labelMap[r.visorColour] ?? r.visorColour) : null,
      attachments: resolveLabels(JSON.parse(r.attachments ?? "[]") as string[], labelMap),
      battleDamage: r.battleDamage,
      custom: r.custom,
      customDetails: r.customDetails,
    }))

  const declined = rows
    .filter((r) => r.status === "DECLINED")
    .map((r) => ({
      id: r.id,
      helmetType: labelMap[r.helmetType] ?? r.helmetType,
      createdAt: r.createdAt.toISOString(),
      declineReason: r.declineReason ?? null,
    }))

  return { active, completed, declined }
}

// ─── Immediate push helpers (called by Redis subscriber + tick) ────────────

async function pushArtTeam() {
  if (artTeamSenders.size === 0) return
  try {
    const data = await fetchActiveRequests()
    artTeamSenders.forEach((s) => s(data))
  } catch { /* transient DB error */ }
}

async function pushUser(userId: string) {
  if (!userSenders.has(userId)) return
  try {
    const data = await fetchUserData(userId)
    userSenders.get(userId)?.forEach((s) => s(data))
    // Update last-seen timestamp so the poll skips this user on the next tick
    const latest = await prisma.request.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    })
    if (latest) userLastTs.set(userId, latest.updatedAt.toISOString())
  } catch { /* transient DB error */ }
}

// ─── Redis pub/sub ─────────────────────────────────────────────────────────

let redisInitialised = false

function initRedis() {
  if (redisInitialised || !redisSub) return
  redisInitialised = true

  redisSub.subscribe("sse:art-team").catch(() => {})
  redisSub.psubscribe("sse:user:*").catch(() => {})

  redisSub.on("message", (_channel: string, _message: string) => {
    void pushArtTeam()
  })

  redisSub.on("pmessage", (_pattern: string, channel: string, _message: string) => {
    const userId = channel.slice("sse:user:".length)
    void pushUser(userId)
  })
}

/**
 * Publish a change event so all workers push to their SSE clients immediately.
 * Call this from API routes after any mutation that affects the SSE streams.
 *
 * publishSseEvent("art-team")          — request board changed
 * publishSseEvent("user", userId)      — specific user's data changed
 */
export async function publishSseEvent(type: "art-team"): Promise<void>
export async function publishSseEvent(type: "user", userId: string): Promise<void>
export async function publishSseEvent(type: "art-team" | "user", userId?: string): Promise<void> {
  if (!redisPub) return
  const channel = type === "art-team" ? "sse:art-team" : `sse:user:${userId}`
  try {
    await redisPub.publish(channel, "1")
  } catch { /* Redis unavailable — clients will catch up on next poll */ }
}

// ─── Shared polling tick (fallback + catch-all) ────────────────────────────

async function tick() {
  // Art team check — 2 queries total regardless of subscriber count
  if (artTeamSenders.size > 0) {
    try {
      const [latest, count] = await Promise.all([
        prisma.request.findFirst({
          where: { status: { in: [...ACTIVE_STATUSES] } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.request.count({ where: { status: { in: [...ACTIVE_STATUSES] } } }),
      ])
      const ts = latest?.updatedAt.toISOString() ?? ""
      if (ts !== artTeamLastTs || count !== artTeamLastCount) {
        artTeamLastTs = ts
        artTeamLastCount = count
        const data = await fetchActiveRequests()
        artTeamSenders.forEach((s) => s(data))
      }
    } catch { /* transient DB error — skip tick */ }
  }

  // User check — 1 groupBy query covers ALL connected users at once
  if (userSenders.size > 0) {
    try {
      const userIds = [...userSenders.keys()]
      const grouped = await prisma.request.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _max: { updatedAt: true },
      })

      for (const row of grouped) {
        const ts = row._max.updatedAt?.toISOString() ?? ""
        if (ts !== userLastTs.get(row.userId)) {
          userLastTs.set(row.userId, ts)
          const data = await fetchUserData(row.userId)
          userSenders.get(row.userId)?.forEach((s) => s(data))
        }
      }
    } catch { /* transient DB error — skip tick */ }
  }
}

// ─── Bus lifecycle ─────────────────────────────────────────────────────────

let interval: ReturnType<typeof setInterval> | null = null

function ensureRunning() {
  initRedis()
  if (interval) return
  interval = setInterval(tick, 5000)
}

function maybeStop() {
  if (artTeamSenders.size === 0 && userSenders.size === 0 && interval) {
    clearInterval(interval)
    interval = null
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export function subscribeArtTeam(send: Sender): () => void {
  artTeamSenders.add(send)
  ensureRunning()
  return () => {
    artTeamSenders.delete(send)
    maybeStop()
  }
}

export function subscribeUser(userId: string, send: Sender): () => void {
  if (!userSenders.has(userId)) userSenders.set(userId, new Set())
  userSenders.get(userId)!.add(send)
  ensureRunning()
  return () => {
    userSenders.get(userId)?.delete(send)
    if (userSenders.get(userId)?.size === 0) userSenders.delete(userId)
    maybeStop()
  }
}