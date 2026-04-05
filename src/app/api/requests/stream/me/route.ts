import { auth } from "@/lib/auth"
import { subscribeUser, fetchUserData } from "@/lib/sse-bus"

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

      // Send initial snapshot immediately, then receive bus updates
      send(await fetchUserData(userId))
      const unsubscribe = subscribeUser(userId, send)

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
