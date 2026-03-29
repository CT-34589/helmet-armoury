import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ClearancesManager } from "./clearances-manager"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")

  const [clearances, artTeamMembers] = await Promise.all([
    prisma.artTeamClearance.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({
      where: { isArtTeam: true },
      select: { id: true, name: true, image: true, artTeamTier: true },
      orderBy: { name: "asc" },
    }),
  ])

  const isAdmin = ["head", "senior"].includes(session.user.artTeamTier ?? "")

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Art Team Clearances</h1>
        <p className="text-sm text-muted-foreground">
          Clearances grant access to specific content (e.g. Special Forces helmets). Assign members individually.
        </p>
      </div>
      <ClearancesManager
        clearances={clearances.map((c) => ({
          id: c.id,
          name: c.name,
          label: c.label,
          description: c.description ?? null,
          memberIds: JSON.parse(c.memberIds) as string[],
          createdAt: new Date(c.createdAt).toISOString(),
        }))}
        artTeamMembers={artTeamMembers.map((m) => ({
          id: m.id,
          name: m.name,
          image: m.image,
          artTeamTier: m.artTeamTier,
        }))}
        isAdmin={isAdmin}
      />
    </div>
  )
}
