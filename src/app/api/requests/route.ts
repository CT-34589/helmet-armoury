import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, recordRateLimit } from "@/lib/rate-limit"
import { checkUserCooldown } from "@/lib/cooldown"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [requests, labelMap] = await Promise.all([
    prisma.request.findMany({
      where: { status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] } },
      include: {
        user: { select: { id: true, name: true, image: true } },
        artist: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getItemLabelMap(),
  ])

  return NextResponse.json(requests.map((r) => ({
    ...r,
    decals: resolveLabels(JSON.parse(r.decals) as string[], labelMap),
    designs: resolveLabels(JSON.parse(r.designs) as string[], labelMap),
    visorColour: r.visorColour ? (labelMap[r.visorColour] ?? r.visorColour) : null,
    attachments: resolveLabels(JSON.parse(r.attachments ?? "[]") as string[], labelMap),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })))
}

const schema = z.object({
  helmetType: z.string().min(1).max(100),
  decals: z.array(z.string().max(100)).max(20).default([]),
  designs: z.array(z.string().max(100)).max(30).default([]),
  visorColour: z.string().max(100).optional().nullable(),
  attachments: z.array(z.string().max(100)).max(20).default([]),
  battleDamage: z.boolean().default(false),
  custom: z.boolean().default(false),
  customDetails: z.string().max(1000).optional(),
  evidenceUrl: z.string().url().optional().nullable(),
  evidenceNote: z.string().max(500).optional().nullable(),
  requestedArtistId: z.string().nullable().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.isBlacklisted) return NextResponse.json({ error: "Blacklisted" }, { status: 403 })

  // Load all settings in one pass (used for eligibility, open/closed, and slot limits)
  let settingsMap: Record<string, string> = {}
  try {
    const rows = await (prisma as any).systemSetting.findMany()
    settingsMap = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]))
  } catch {}

  // Eligibility check — CT+ required unless art team
  if (!session.user.isArtTeam) {
    const eligibleRoleIds = (settingsMap["request_eligible_role_ids"] ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    if (eligibleRoleIds.length > 0) {
      const userRoles = [...(session.user.discordRoles ?? []), ...(session.user.kmcRoles ?? [])]
      if (!eligibleRoleIds.some((id) => userRoles.includes(id))) {
        return NextResponse.json({ error: "You must be CT or higher to submit a request" }, { status: 403 })
      }
    }
  }

  // Check requests open
  if (settingsMap["requests_open"] === "false") {
    return NextResponse.json({ error: "Requests are currently closed" }, { status: 403 })
  }

  // Cooldown check
  const cooldown = await checkUserCooldown(session.user.id)
  if (cooldown.active) {
    return NextResponse.json(
      { error: `You are in a cooldown period until ${cooldown.availableAt?.toLocaleDateString()}` },
      { status: 429 }
    )
  }

  // Request lock — one open request at a time
  const openRequest = await prisma.request.findFirst({
    where: { userId: session.user.id, status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] }, direct: false },
  })
  if (openRequest) {
    return NextResponse.json({ error: "You already have an open request" }, { status: 409 })
  }

  // Rate limiting
  const rl = await checkRateLimit(session.user.id, "request:submit")
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit reached. Try again after ${rl.resetAt.toLocaleTimeString()}` },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000)) } }
    )
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 })

  const d = parsed.data

  // Slot limit check — art team bypasses
  if (!session.user.isArtTeam) {
    const slotIds = (key: string) => (settingsMap[key] ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    const kmcRoles = session.user.discordRoles ?? []
    const sgmPlusIds = slotIds("cooldown_rank_sgm_plus_role_ids").length > 0
      ? slotIds("cooldown_rank_sgm_plus_role_ids")
      : (process.env.KMC_SGM_PLUS_ROLE_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean)

    if (!sgmPlusIds.some((id) => kmcRoles.includes(id))) {
      let tier = "ct_po"
      if (slotIds("slot_rank_sgt_fcpt_role_ids").some((id) => kmcRoles.includes(id)))     tier = "sgt_fcpt"
      else if (slotIds("slot_rank_cpl_flt_role_ids").some((id) => kmcRoles.includes(id))) tier = "cpl_flt"
      else if (slotIds("slot_rank_lcpl_fo_role_ids").some((id) => kmcRoles.includes(id))) tier = "lcpl_fo"

      const decalLimit  = parseInt(settingsMap[`slots_decals_${tier}`]  ?? "0", 10)
      const designLimit = parseInt(settingsMap[`slots_designs_${tier}`] ?? "0", 10)

      if (decalLimit > 0 || designLimit > 0) {
        // Fetch slot weights for submitted items
        const allNames = [...d.decals, ...d.designs]
        const configItems = allNames.length > 0
          ? await prisma.configItem.findMany({ where: { name: { in: allNames } }, select: { name: true, slotWeight: true } })
          : []
        const weightMap = new Map(configItems.map((c) => [c.name, c.slotWeight ?? 1]))

        if (decalLimit > 0) {
          const used = d.decals.reduce((sum, n) => sum + (weightMap.get(n) ?? 1), 0)
          if (used > decalLimit) {
            return NextResponse.json({ error: `Too many decals — your rank allows ${decalLimit} slot${decalLimit !== 1 ? "s" : ""}` }, { status: 400 })
          }
        }
        if (designLimit > 0) {
          const used = d.designs.reduce((sum, n) => sum + (weightMap.get(n) ?? 1), 0)
          if (used > designLimit) {
            return NextResponse.json({ error: `Too many designs — your rank allows ${designLimit} slot${designLimit !== 1 ? "s" : ""}` }, { status: 400 })
          }
        }
      }
    }
  }

  const request = await prisma.request.create({
    data: {
      userId: session.user.id,
      helmetType: d.helmetType,
      decals: JSON.stringify(d.decals),
      designs: JSON.stringify(d.designs),
      visorColour: d.visorColour || null,
      attachments: JSON.stringify(d.attachments),
      battleDamage: d.battleDamage,
      custom: d.custom,
      customDetails: d.customDetails,
      evidenceUrl: d.evidenceUrl || null,
      evidenceNote: d.evidenceNote || null,
      requestedArtistId: d.requestedArtistId || null,
    },
  })

  await recordRateLimit(session.user.id, "request:submit")
  return NextResponse.json(request, { status: 201 })
}
