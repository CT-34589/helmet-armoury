import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  const body = await req.json()

  const item = await prisma.configItem.update({
    where: { id },
    data: {
      ...(body.active !== undefined && { active: Boolean(body.active) }),
      ...(body.standard !== undefined && { standard: Boolean(body.standard) }),
      ...(body.label !== undefined && { label: body.label }),
      ...(body.requirement !== undefined && { requirement: body.requirement || null }),
      ...(body.rankReq !== undefined && { rankReq: body.rankReq || null }),
      ...(body.note !== undefined && { note: body.note || null }),
      ...(body.subCategory !== undefined && { subCategory: body.subCategory || null }),
      ...(body.helmetCategory !== undefined && { helmetCategory: body.helmetCategory || null }),
      ...(body.allowedRoleIds !== undefined && { allowedRoleIds: JSON.stringify(body.allowedRoleIds) }),
      ...(body.slotWeight !== undefined && { slotWeight: Math.max(1, parseInt(body.slotWeight, 10) || 1) }),
    },
  })
  revalidateTag("config", "max")
  return NextResponse.json({ ...item, createdAt: item.createdAt.toISOString() })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  await prisma.configItem.delete({ where: { id } })
  revalidateTag("config", "max")
  return NextResponse.json({ ok: true })
}
