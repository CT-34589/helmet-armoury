import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

interface DiscordRole {
  id: string
  name: string
  color: number
  position: number
}

// In-memory cache — survives the request but not a server restart (fine for config UI)
let cachedRoles: { id: string; name: string; color: number }[] | null = null
let cacheExpiry = 0

export async function GET() {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID

  if (!botToken || !guildId) {
    return NextResponse.json([])
  }

  if (cachedRoles && Date.now() < cacheExpiry) {
    return NextResponse.json(cachedRoles)
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json([])

    const roles = (await res.json()) as DiscordRole[]
    cachedRoles = roles
      .filter((r) => r.name !== "@everyone")
      .sort((a, b) => b.position - a.position)
      .map(({ id, name, color }) => ({ id, name, color }))
    cacheExpiry = Date.now() + 5 * 60 * 1000

    return NextResponse.json(cachedRoles)
  } catch {
    return NextResponse.json([])
  }
}
