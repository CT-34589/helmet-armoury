import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"

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

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return new Response("Forbidden", { status: 403 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false

      const send = (data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      // Initial payload
      const initial = await fetchActiveRequests()
      let lastTs = initial.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), "")
      let lastCount = initial.length
      send(initial)

      // Server-side poll — check count + max updatedAt every 5s
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return }
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
          if (ts !== lastTs || count !== lastCount) {
            lastTs = ts
            lastCount = count
            send(await fetchActiveRequests())
          }
        } catch {
          // Transient DB error — keep the connection alive and retry next tick
        }
      }, 5000)

      req.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(interval)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
