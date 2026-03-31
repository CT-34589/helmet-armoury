import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"

async function fetchUserRequests(userId: string) {
  const labelMap = await getItemLabelMap()
  const rows = await prisma.request.findMany({
    where: {
      userId,
      status: { notIn: ["COMPLETED", "DECLINED"] },
      direct: false,
    },
    include: { artist: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((r) => ({
    id: r.id,
    helmetType: labelMap[r.helmetType] ?? r.helmetType,
    status: r.status,
    artistName: r.artist?.name ?? null,
    declineReason: r.declineReason ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response("Unauthorized", { status: 401 })

  const userId = session.user.id
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
      const initial = await fetchUserRequests(userId)
      let lastTs = initial.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), "")
      send(initial)

      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return }
        try {
          const changed = await prisma.request.findFirst({
            where: {
              userId,
              direct: false,
              updatedAt: { gt: new Date(lastTs || 0) },
            },
            select: { updatedAt: true },
          })

          if (changed) {
            const updated = await fetchUserRequests(userId)
            lastTs = updated.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), lastTs)
            send(updated)
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
