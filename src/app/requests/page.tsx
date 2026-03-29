import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"
import { getArtTeamMembers } from "@/lib/cached-queries"
import { OverviewBoard } from "./overview-board"

export default async function RequestsOverviewPage() {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")

  const [requests, artists, labelMap] = await Promise.all([
    prisma.request.findMany({
      where: { status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] } },
      include: {
        user: { select: { id: true, name: true, image: true } },
        artist: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getArtTeamMembers(),
    getItemLabelMap(),
  ])

  const serialized = requests.map((r) => ({
    ...r,
    decals: resolveLabels(JSON.parse(r.decals) as string[], labelMap),
    designs: resolveLabels(JSON.parse(r.designs) as string[], labelMap),
    visorColour: r.visorColour ? (labelMap[r.visorColour] ?? r.visorColour) : null,
    attachments: resolveLabels(JSON.parse(r.attachments ?? "[]") as string[], labelMap),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return (
    <OverviewBoard
      requests={serialized}
      artists={artists}
      currentUserId={session.user.id}
    />
  )
}
