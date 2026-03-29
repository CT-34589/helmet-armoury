import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const note = (formData.get("note") as string) ?? ""
  const requestId = (formData.get("requestId") as string) ?? "unknown"
  const file = formData.get("file") as File | null

  const webhookUrl = process.env.DISCORD_EVIDENCE_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const embed = {
    title: "📋 Evidence Submission",
    color: 0x5865f2,
    fields: [
      { name: "Trooper", value: session.user.name ?? "Unknown", inline: true },
      { name: "Request ID", value: `#${requestId.slice(-8)}`, inline: true },
      ...(note ? [{ name: "Note", value: note }] : []),
    ],
    footer: { text: `User ID: ${session.user.id}` },
    timestamp: new Date().toISOString(),
  }

  const payload = new FormData()
  payload.append("payload_json", JSON.stringify({
    username: "104th Helmet Armoury",
    embeds: [embed],
  }))
  if (file) {
    payload.append("files[0]", file, file.name)
  }

  // Use ?wait=true so Discord returns the created message object with its ID
  const res = await fetch(`${webhookUrl}?wait=true`, {
    method: "POST",
    body: payload,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("Discord webhook error:", text)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }

  let messageUrl: string | undefined
  try {
    const msg = await res.json() as { id: string; channel_id: string }
    const guildId = process.env.DISCORD_GUILD_ID
    if (guildId && msg.id && msg.channel_id) {
      messageUrl = `https://discord.com/channels/${guildId}/${msg.channel_id}/${msg.id}`
    }
  } catch {
    // If we can't parse the message, just proceed without the link
  }

  return NextResponse.json({ ok: true, messageUrl })
}
