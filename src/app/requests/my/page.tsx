import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"
import { MyRequestsTable } from "./my-requests-table"

export default async function MyArtRequestsPage() {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")

  const [requests, labelMap] = await Promise.all([
    prisma.request.findMany({
      where: { artistId: session.user.id, status: "IN_PROGRESS" },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    getItemLabelMap(),
  ])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Requests</h1>
        <p className="text-sm text-muted-foreground">
          {requests.length} in progress
        </p>
      </div>
      <MyRequestsTable
        currentUserId={session.user.id}
        requests={requests.map((r) => ({
          id: r.id,
          helmetType: labelMap[r.helmetType] ?? r.helmetType,
          userName: r.user.name,
          userImage: r.user.image,
          createdAt: r.createdAt.toISOString(),
          decals: resolveLabels(JSON.parse(r.decals) as string[], labelMap),
          designs: resolveLabels(JSON.parse(r.designs) as string[], labelMap),
          visorColour: r.visorColour ? (labelMap[r.visorColour] ?? r.visorColour) : null,
          attachments: resolveLabels(JSON.parse(r.attachments) as string[], labelMap),
          battleDamage: r.battleDamage,
          custom: r.custom,
          customDetails: r.customDetails,
          evidenceUrl: r.evidenceUrl,
          evidenceNote: r.evidenceNote,
          internalNotes: r.internalNotes,
        }))}
      />
    </div>
  )
}
