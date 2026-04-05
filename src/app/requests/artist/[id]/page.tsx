import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"
import { notFound } from "next/navigation"
import { ArtistBoard } from "./artist-board"

interface Props { params: Promise<{ id: string }> }

export default async function ArtistPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")
  const { id } = await params

  const [artist, requests, labelMap] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, image: true },
    }),
    prisma.request.findMany({
      where: { artistId: id, status: "IN_PROGRESS" },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { updatedAt: "asc" },
    }),
    getItemLabelMap(),
  ])

  if (!artist) notFound()

  return (
    <ArtistBoard
      artist={artist}
      requests={requests.map((r) => ({
        ...r,
        user: r.user,
        decals: resolveLabels(JSON.parse(r.decals) as string[], labelMap),
        designs: resolveLabels(JSON.parse(r.designs) as string[], labelMap),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
    />
  )
}
