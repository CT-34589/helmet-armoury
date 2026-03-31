import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

interface DiscordRole {
  id: string
  name: string
  color: number
  position: number
}

type CachedRoles = { id: string; name: string; color: number }[]

// Separate caches per guild
let cachedMain: CachedRoles | null = null
let mainExpiry = 0
let cachedKmc: CachedRoles | null = null
let kmcExpiry = 0

async function fetchGuildRoles(guildId: string, botToken: string): Promise<CachedRoles> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: "no-store",
  })
  if (!res.ok) return []
  const roles = (await res.json()) as DiscordRole[]
  return roles
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position)
    .map(({ id, name, color }) => ({ id, name, color }))
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const botToken = process.env.DISCORD_BOT_TOKEN
  const guild = req.nextUrl.searchParams.get("guild") === "kmc" ? "kmc" : "main"
  const guildId = guild === "kmc" ? process.env.KMC_GUILD_ID : process.env.DISCORD_GUILD_ID

  if (!botToken || !guildId) return NextResponse.json([])

  const now = Date.now()
  if (guild === "kmc" && cachedKmc && now < kmcExpiry) return NextResponse.json(cachedKmc)
  if (guild === "main" && cachedMain && now < mainExpiry) return NextResponse.json(cachedMain)

  try {
    const roles = await fetchGuildRoles(guildId, botToken)
    if (guild === "kmc") { cachedKmc = roles; kmcExpiry = now + 5 * 60 * 1000 }
    else { cachedMain = roles; mainExpiry = now + 5 * 60 * 1000 }
    return NextResponse.json(roles)
  } catch {
    return NextResponse.json([])
  }
}
