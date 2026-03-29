import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  const body = await req.json()

  const user = await prisma.user.update({
    where: { id },
    data: {
      isArtTeam: body.isArtTeam !== undefined ? Boolean(body.isArtTeam) : undefined,
      artTeamTier: body.artTeamTier !== undefined ? body.artTeamTier : undefined,
    },
    select: { id: true, name: true, isArtTeam: true, artTeamTier: true },
  })

  // Force re-login so new privileges take effect immediately
  await prisma.session.deleteMany({ where: { userId: id } })

  revalidateTag("art-team", "max")
  return NextResponse.json(user)
}
