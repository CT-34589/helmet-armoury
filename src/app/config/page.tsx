import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAllConfigItems, getHelmetCategories } from "@/lib/cached-queries"
import { ConfigManager } from "./config-manager"

interface ClearanceOption { name: string; label: string }

export default async function Page() {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")

  const [items, helmetCategories] = await Promise.all([
    getAllConfigItems(),
    getHelmetCategories(),
  ])

  let clearanceDefs: ClearanceOption[] = []
  try {
    clearanceDefs = await prisma.artTeamClearance.findMany({ select: { name: true, label: true }, orderBy: { createdAt: "asc" } })
  } catch { /* table may not exist yet */ }

  let settingsMap: Record<string, string> = {}
  try {
    const settings = await prisma.systemSetting.findMany()
    settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  } catch {
    // Table doesn't exist yet — run: npx prisma generate && npx prisma db push
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Manage system settings, helmet types, decals, designs, and more.
        </p>
      </div>
      <ConfigManager
        items={items.map((i) => ({
          ...i,
          subCategory: i.subCategory ?? null,
          requirement: i.requirement ?? null,
          standard: i.standard ?? true,
          createdAt: new Date(i.createdAt).toISOString(),
          allowedRoleIds: JSON.parse(i.allowedRoleIds) as string[],
        }))}
        settings={settingsMap}
        helmetCategories={helmetCategories.map((c) => ({
          id: c.id,
          name: c.name,
          sortOrder: c.sortOrder,
          clearance: c.clearance ?? null,
        }))}
        clearanceOptions={clearanceDefs}
      />
    </div>
  )
}
