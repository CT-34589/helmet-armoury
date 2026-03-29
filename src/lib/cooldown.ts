import { prisma } from "./prisma"

function envList(key: string): string[] {
  return (process.env[key] ?? "").split(",").map((s) => s.trim()).filter(Boolean)
}

export type RankCategory = "head_cadre" | "cadre" | "sgm_plus" | "ct_sgt"
export type CooldownType = "custom" | "decaled"

/**
 * Determines the user's KMC rank category from their cached KMC role IDs.
 * Priority order: head_cadre > cadre > sgm_plus > ct_sgt (default)
 */
export function getRankCategory(kmcRoles: string[]): RankCategory {
  if (envList("KMC_HEAD_CADRE_ROLE_IDS").some((id) => kmcRoles.includes(id))) return "head_cadre"
  if (envList("KMC_CADRE_ROLE_IDS").some((id) => kmcRoles.includes(id))) return "cadre"
  if (envList("KMC_SGM_PLUS_ROLE_IDS").some((id) => kmcRoles.includes(id))) return "sgm_plus"
  return "ct_sgt"
}

/**
 * Determines which cooldown category a completed helmet falls under:
 *
 * Decaled: Standard + CT-SGT rank | Non-Standard + (not Cadre/Head Cadre)
 * Custom:  Standard + SGM+/Cadre/Head Cadre | Non-Standard + Cadre/Head Cadre | SF clearance-gated helmets
 */
export function determineCooldownType(
  helmetStandard: boolean,
  helmetSf: boolean,
  rank: RankCategory
): CooldownType {
  if (helmetSf) return "custom"
  if (helmetStandard) {
    return rank === "sgm_plus" || rank === "cadre" || rank === "head_cadre" ? "custom" : "decaled"
  }
  // Non-standard: Cadre/Head Cadre → custom; others (CT-SGT, SGM+) → decaled
  return rank === "cadre" || rank === "head_cadre" ? "custom" : "decaled"
}

/**
 * Cooldown durations after completing a request:
 * Decaled: 3 months (first) / 6 months (subsequent)
 * Custom:  6 months (first) / 9 months (subsequent)
 */
export function getCooldownDays(type: CooldownType, isFirst: boolean): number {
  if (type === "decaled") return isFirst ? 90 : 180
  return isFirst ? 180 : 270
}

export interface CooldownStatus {
  active: boolean
  availableAt?: Date
  type?: CooldownType
  daysRemaining?: number
}

/**
 * Looks up the cooldown type for a helmet by resolving its ConfigItem and HelmetCategory.
 * Returns null if the helmet type isn't found in config.
 */
export async function resolveHelmetCooldownType(
  helmetTypeName: string,
  kmcRoles: string[]
): Promise<CooldownType> {
  const rank = getRankCategory(kmcRoles)

  const configItem = await prisma.configItem.findFirst({
    where: { category: "helmetType", name: helmetTypeName },
    select: { standard: true, helmetCategory: true },
  })

  const helmetStandard = configItem?.standard ?? true

  let helmetSf = false
  if (configItem?.helmetCategory) {
    const cat = await prisma.helmetCategory.findUnique({
      where: { name: configItem.helmetCategory },
      select: { clearance: true },
    })
    helmetSf = cat?.clearance === "sf"
  }

  return determineCooldownType(helmetStandard, helmetSf, rank)
}

/**
 * Checks whether a user currently has an active cooldown from their last completed request.
 * "First" vs "subsequent" is per cooldown type (decaled / custom).
 */
export async function checkUserCooldown(userId: string): Promise<CooldownStatus> {
  const lastCompleted = await prisma.request.findFirst({
    where: {
      userId,
      status: "COMPLETED",
      direct: false,
      completedAt: { not: null },
      cooldownType: { not: null },
    },
    orderBy: { completedAt: "desc" },
    select: { id: true, completedAt: true, cooldownType: true },
  })

  if (!lastCompleted?.completedAt || !lastCompleted.cooldownType) return { active: false }

  const type = lastCompleted.cooldownType as CooldownType

  // Count prior completed requests of the same cooldown type (to determine first vs subsequent)
  const priorSameType = await prisma.request.count({
    where: {
      userId,
      status: "COMPLETED",
      direct: false,
      cooldownType: type,
      completedAt: { lt: lastCompleted.completedAt },
    },
  })

  const isFirst = priorSameType === 0
  const cooldownDays = getCooldownDays(type, isFirst)
  const availableAt = new Date(lastCompleted.completedAt.getTime() + cooldownDays * 24 * 60 * 60 * 1000)

  if (Date.now() < availableAt.getTime()) {
    return {
      active: true,
      availableAt,
      type,
      daysRemaining: Math.ceil((availableAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }
  }

  return { active: false }
}
