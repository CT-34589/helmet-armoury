/**
 * Shared SSE bus — one polling interval per worker process, regardless of
 * how many clients are connected. Eliminates per-connection DB polls.
 *
 * Art team stream:  2 lightweight queries per tick (findFirst + count)
 * User streams:     1 groupBy query per tick covering ALL connected users,
 *                   then full fetch only for users whose data actually changed
 */

import { prisma } from "./prisma"
import { getItemLabelMap, resolveLabels } from "./label-lookup"

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
    where: { userId, direct: false },
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

// ─── Shared tick ───────────────────────────────────────────────────────────

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
        where: { userId: { in: userIds }, direct: false },
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
  if (interval) return
  interval = setInterval(tick, 2000)
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
