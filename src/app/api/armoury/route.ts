import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ALLOWED_TIERS = ["head", "senior", "primary"]

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (!session.user.artTeamTier || !ALLOWED_TIERS.includes(session.user.artTeamTier)) {
    return NextResponse.json({ error: "Insufficient tier — SAT+ required" }, { status: 403 })
  }

  const { userId, helmetType, completedImageUrl } = await req.json()
  if (!userId || !helmetType || !completedImageUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const request = await prisma.request.create({
    data: {
      userId,
      helmetType,
      completedImageUrl,
      status: "COMPLETED",
      direct: true,
      addedById: session.user.id,
      artistId: session.user.id,
      decals: "[]",
      designs: "[]",
    },
  })
  return NextResponse.json(request, { status: 201 })
}
