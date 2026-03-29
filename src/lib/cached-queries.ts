import { unstable_cache } from "next/cache"
import { prisma } from "./prisma"

/** Active config items for the request form dropdowns. Cached 24h, invalidated on config changes. */
export const getActiveConfigItems = unstable_cache(
  async () => {
    return prisma.configItem.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    })
  },
  ["active-config-items"],
  { revalidate: 86400, tags: ["config"] }
)

/** All config items for the config management page. Cached 24h, invalidated on config changes. */
export const getAllConfigItems = unstable_cache(
  async () => {
    return prisma.configItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    })
  },
  ["all-config-items"],
  { revalidate: 86400, tags: ["config"] }
)

/** Helmet categories. Cached 24h, invalidated on config changes. */
export const getHelmetCategories = unstable_cache(
  async () => {
    return prisma.helmetCategory.findMany({ orderBy: { sortOrder: "asc" } })
  },
  ["helmet-categories"],
  { revalidate: 86400, tags: ["config"] }
)

/** Art team member list. Cached 1h, invalidated when art team membership changes. */
export const getArtTeamMembers = unstable_cache(
  async () => {
    return prisma.user.findMany({
      where: { isArtTeam: true },
      select: { id: true, name: true, image: true },
      orderBy: { name: "asc" },
    })
  },
  ["art-team-members"],
  { revalidate: 3600, tags: ["art-team"] }
)
