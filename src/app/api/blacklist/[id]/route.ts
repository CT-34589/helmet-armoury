import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  await prisma.user.update({ where: { id }, data: { isBlacklisted: false, blacklistReason: null } })
  return NextResponse.json({ ok: true })
}
