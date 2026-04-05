import { auth } from "@/lib/auth"
import { subscribeArtTeam, fetchActiveRequests } from "@/lib/sse-bus"

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

      // Send initial snapshot immediately, then receive bus updates
      send(await fetchActiveRequests())
      const unsubscribe = subscribeArtTeam(send)

      req.signal.addEventListener("abort", () => {
        closed = true
        unsubscribe()
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
