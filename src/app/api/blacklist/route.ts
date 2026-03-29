import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { userId, reason } = await req.json()
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isBlacklisted: true, blacklistReason: reason || null },
  })

  // Force immediate sign-out by deleting all their sessions
  await prisma.session.deleteMany({ where: { userId } })

  return NextResponse.json({ ...user, createdAt: user.createdAt.toISOString() })
}
