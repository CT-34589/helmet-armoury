import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BlacklistManager } from "./blacklist-manager"

export default async function BlacklistPage() {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")

  const [blacklisted, allUsers] = await Promise.all([
    prisma.user.findMany({ where: { isBlacklisted: true }, include: { _count: { select: { requests: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { isBlacklisted: false }, select: { id: true, name: true, discordId: true }, orderBy: { name: "asc" } }),
  ])

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Blacklist</h1>
        <p className="text-sm text-muted-foreground">Blacklisted users cannot sign in or submit requests.</p>
      </div>
      <BlacklistManager
        blacklisted={blacklisted.map((u) => ({ id: u.id, name: u.name, image: u.image, discordId: u.discordId, blacklistReason: u.blacklistReason, requestCount: u._count.requests, createdAt: u.createdAt.toISOString() }))}
        allUsers={allUsers.map((u) => ({ id: u.id, name: u.name, discordId: u.discordId }))}
      />
    </div>
  )
}
