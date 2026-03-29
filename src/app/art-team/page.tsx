import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ArtTeamManager } from "./art-team-manager"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")

  const [members, allUsers] = await Promise.all([
    prisma.user.findMany({
      where: { isArtTeam: true },
      include: { _count: { select: { assignedRequests: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { isArtTeam: false, isBlacklisted: false },
      select: { id: true, name: true, image: true, discordId: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Art Team</h1>
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </p>
      </div>
      <ArtTeamManager
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          image: m.image,
          discordId: m.discordId,
          artTeamTier: (m as any).artTeamTier ?? null,
          activeRequests: m._count.assignedRequests,
          createdAt: m.createdAt.toISOString(),
        }))}
        allUsers={allUsers}
      />
    </div>
  )
}
