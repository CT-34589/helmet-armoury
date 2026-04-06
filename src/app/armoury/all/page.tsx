import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ArmouryTable } from "./armoury-table"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"
import type { RequestStatus } from "@/lib/utils"

interface Props { searchParams: Promise<{ q?: string; status?: string; page?: string }> }

export default async function AllArmouryPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")
  const { q, status, page } = await searchParams
  const pageNum = Math.max(1, Number(page) || 1)
  const pageSize = 20

  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ helmetType: { contains: q } }, { user: { name: { contains: q } } }] } : {}),
  }

  const [requests, total, labelMap] = await Promise.all([
    prisma.request.findMany({
      where, include: { user: { select: { id: true, name: true, image: true } }, artist: { select: { name: true } } },
      orderBy: { createdAt: "desc" }, skip: (pageNum - 1) * pageSize, take: pageSize,
    }),
    prisma.request.count({ where }),
    getItemLabelMap(),
  ])

  const isHead = session.user.artTeamTier === "head"

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Full Archive</h1>
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} total helmets</p>
      </div>
      <ArmouryTable
        isHead={isHead}
        requests={requests.map((r) => ({
          id: r.id, helmetType: labelMap[r.helmetType] ?? r.helmetType, status: r.status as RequestStatus,
          completedImageUrl: r.completedImageUrl, createdAt: r.createdAt.toISOString(),
          userName: r.user.name, userImage: r.user.image, artistName: r.artist?.name ?? null,
          decals: resolveLabels(JSON.parse(r.decals) as string[], labelMap),
          designs: resolveLabels(JSON.parse(r.designs) as string[], labelMap),
          visorColour: r.visorColour ? (labelMap[r.visorColour] ?? r.visorColour) : null,
          attachments: resolveLabels(JSON.parse(r.attachments ?? "[]") as string[], labelMap),
          battleDamage: r.battleDamage, custom: r.custom,
          customDetails: r.customDetails, evidenceUrl: r.evidenceUrl,
          evidenceNote: r.evidenceNote, declineReason: r.declineReason,
        }))}
        total={total} page={pageNum} pageSize={pageSize} currentQ={q} currentStatus={status}
      />
    </div>
  )
}
