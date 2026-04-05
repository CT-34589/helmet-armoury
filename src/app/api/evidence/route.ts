import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import sharp from "sharp"

// Discord webhook limits
const MAX_FILES = 10
const MAX_TOTAL_BYTES = 24 * 1024 * 1024 // 24MB to stay safely under 25MB

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const note = (formData.get("note") as string) ?? ""
  const requestId = (formData.get("requestId") as string) ?? "unknown"

  // Collect up to MAX_FILES image files
  const rawFiles: File[] = []
  for (let i = 0; i < MAX_FILES; i++) {
    const f = formData.get(`file_${i}`) as File | null
    if (!f) break
    rawFiles.push(f)
  }

  const webhookUrl = process.env.DISCORD_EVIDENCE_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  // Compress each image with sharp: resize to max 1920px, convert to JPEG
  // Then check total size; if over budget reduce quality and retry
  const compress = async (file: File, quality: number): Promise<Buffer> => {
    const buf = Buffer.from(await file.arrayBuffer())
    return sharp(buf)
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer()
  }

  let compressed: { buffer: Buffer; name: string }[] = []

  for (const q of [80, 65, 50]) {
    compressed = await Promise.all(
      rawFiles.map(async (f) => ({
        buffer: await compress(f, q),
        name: f.name.replace(/\.[^.]+$/, ".jpg"),
      }))
    )
    const total = compressed.reduce((sum, c) => sum + c.buffer.byteLength, 0)
    if (total <= MAX_TOTAL_BYTES) break
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
  compressed.forEach((c, i) => {
    const ab = c.buffer.buffer as ArrayBuffer
    payload.append(`files[${i}]`, new Blob([ab], { type: "image/jpeg" }), c.name)
  })

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
    // proceed without link
  }

  return NextResponse.json({ ok: true, messageUrl })
}
