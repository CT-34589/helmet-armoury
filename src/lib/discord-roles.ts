// Utilities for checking Discord guild roles at sign-in time
// Role IDs are configured via environment variables

export interface RoleCheckResult {
  isArtTeam: boolean
  artTeamTier: string | null
  hasCustomHelmetAccess: boolean   // rank-gated
  isActiveMember: boolean
  discordRoles: string[]
  kmcRoles: string[]
}

function envList(key: string): string[] {
  return (process.env[key] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function fetchGuildRoles(
  accessToken: string,
  guildId: string
): Promise<string[]> {
  try {
    const res = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildId}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return []
    const member = await res.json()
    return Array.isArray(member.roles) ? member.roles : []
  } catch {
    return []
  }
}

export async function checkDiscordRoles(
  accessToken: string,
  settings: Record<string, string> = {}
): Promise<RoleCheckResult> {
  const mainGuildId = process.env.DISCORD_GUILD_ID ?? ""
  const kmcGuildId = process.env.KMC_GUILD_ID ?? ""

  // Fetch both guilds in parallel
  const [discordRoles, kmcRoles] = await Promise.all([
    mainGuildId ? fetchGuildRoles(accessToken, mainGuildId) : Promise.resolve([]),
    kmcGuildId ? fetchGuildRoles(accessToken, kmcGuildId) : Promise.resolve([]),
  ])

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

  // Active member check — must have a company role OR a staff role
  // SystemSettings override env vars when present
  function settingOrEnv(settingKey: string, envKey: string): string[] {
    const fromSettings = settings[settingKey]
    if (fromSettings !== undefined) {
      return fromSettings.split(",").map((s) => s.trim()).filter(Boolean)
    }
    return envList(envKey)
  }
  const companyRoleIds = settingOrEnv("active_member_role_ids", "DISCORD_COMPANY_ROLE_IDS")
  const staffRoleIds = settingOrEnv("active_staff_role_ids", "DISCORD_STAFF_ROLE_IDS")
  const isActiveMember =
    companyRoleIds.length === 0 || // if not configured, allow everyone
    companyRoleIds.some((id) => discordRoles.includes(id)) ||
    staffRoleIds.some((id) => discordRoles.includes(id))

  return {
    isArtTeam,
    artTeamTier,
    hasCustomHelmetAccess,
    isActiveMember,
    discordRoles,
    kmcRoles,
  }
}
