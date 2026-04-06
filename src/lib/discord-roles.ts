// Utilities for checking Discord guild roles at sign-in time
// Role IDs are configured via environment variables

export interface RoleCheckResult {
  isArtTeam: boolean
  artTeamTier: string | null
  hasCustomHelmetAccess: boolean   // rank-gated
  discordRoles: string[]
  kmcRoles: string[]
  serverDisplayName: string | null
}

function envList(key: string): string[] {
  return (process.env[key] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function fetchGuildMember(
  accessToken: string,
  guildId: string
): Promise<{ roles: string[]; nick: string | null }> {
  try {
    const res = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildId}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return { roles: [], nick: null }
    const member = await res.json()
    // Prefer server nickname → global display name → username (legacy fallback)
    const displayName =
      member.nick ??
      member.user?.global_name ??
      member.user?.username ??
      null
    return {
      roles: Array.isArray(member.roles) ? member.roles : [],
      nick: displayName,
    }
  } catch {
    return { roles: [], nick: null }
  }
}

export async function checkDiscordRoles(
  accessToken: string,
  settings: Record<string, string> = {}
): Promise<RoleCheckResult> {
  const mainGuildId = process.env.DISCORD_GUILD_ID ?? ""
  const kmcGuildId = process.env.KMC_GUILD_ID ?? ""

  // Fetch both guilds in parallel
  const [mainMember, kmcMember] = await Promise.all([
    mainGuildId ? fetchGuildMember(accessToken, mainGuildId) : Promise.resolve({ roles: [], nick: null }),
    kmcGuildId ? fetchGuildMember(accessToken, kmcGuildId) : Promise.resolve({ roles: [], nick: null }),
  ])
  const discordRoles = mainMember.roles
  const kmcRoles = kmcMember.roles

  // Art team tier detection — ordered highest to lowest priority
  const tierRoles: Array<{ key: string; tier: string }> = [
    { key: "DISCORD_HEAD_ART_TEAM_ROLE_ID", tier: "head" },
    { key: "DISCORD_SENIOR_ART_TEAM_ROLE_ID", tier: "senior" },
    { key: "DISCORD_PRIMARY_ART_TEAM_ROLE_ID", tier: "primary" },
    { key: "DISCORD_RESERVE_ART_TEAM_ROLE_ID", tier: "reserve" },
  ]

  let isArtTeam = false
  let artTeamTier: string | null = null

  for (const { key, tier } of tierRoles) {
    const roleId = process.env[key]
    if (roleId && discordRoles.includes(roleId)) {
      isArtTeam = true
      artTeamTier = tier
      break
    }
  }

  // Custom helmet access — based on a list of rank role IDs
  const customHelmetRoleIds = envList("DISCORD_CUSTOM_HELMET_ROLE_IDS")
  const hasCustomHelmetAccess =
    customHelmetRoleIds.length === 0 ||
    customHelmetRoleIds.some((id) => discordRoles.includes(id))

  return {
    isArtTeam,
    artTeamTier,
    hasCustomHelmetAccess,
    discordRoles,
    kmcRoles,
    serverDisplayName: mainMember.nick,
  }
}
