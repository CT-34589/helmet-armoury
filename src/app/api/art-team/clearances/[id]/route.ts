import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const SAT_ADMIN = ["head", "senior"]

const schema = z.object({
  label: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  memberIds: z.array(z.string().cuid()).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!SAT_ADMIN.includes(session?.user?.artTeamTier ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.artTeamClearance.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (parsed.data.label !== undefined) data.label = parsed.data.label
  if (parsed.data.description !== undefined) data.description = parsed.data.description

  if (parsed.data.memberIds !== undefined) {
    const newIds = parsed.data.memberIds
    const oldIds = JSON.parse(existing.memberIds) as string[]
    data.memberIds = JSON.stringify(newIds)

    // Sync User.clearances for affected members immediately
    const added = newIds.filter((uid) => !oldIds.includes(uid))
    const removed = oldIds.filter((uid) => !newIds.includes(uid))

    await Promise.all([
      ...added.map(async (uid) => {
        const u = await prisma.user.findUnique({ where: { id: uid }, select: { clearances: true } })
        if (!u) return
        const current = JSON.parse(u.clearances) as string[]
        if (!current.includes(existing.name)) {
          await prisma.user.update({ where: { id: uid }, data: { clearances: JSON.stringify([...current, existing.name]) } })
        }
      }),
      ...removed.map(async (uid) => {
        const u = await prisma.user.findUnique({ where: { id: uid }, select: { clearances: true } })
        if (!u) return
        const current = JSON.parse(u.clearances) as string[]
        await prisma.user.update({ where: { id: uid }, data: { clearances: JSON.stringify(current.filter((n) => n !== existing.name)) } })
      }),
    ])
  }

  const clearance = await prisma.artTeamClearance.update({ where: { id }, data })

  return NextResponse.json({
    ...clearance,
    memberIds: JSON.parse(clearance.memberIds) as string[],
    createdAt: clearance.createdAt.toISOString(),
    updatedAt: clearance.updatedAt.toISOString(),
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!SAT_ADMIN.includes(session?.user?.artTeamTier ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.artTeamClearance.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Remove this clearance from all users who have it
  const memberIds = JSON.parse(existing.memberIds) as string[]
  await Promise.all(
    memberIds.map(async (uid) => {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { clearances: true } })
      if (!u) return
      const current = JSON.parse(u.clearances) as string[]
      await prisma.user.update({ where: { id: uid }, data: { clearances: JSON.stringify(current.filter((n) => n !== existing.name)) } })
    })
  )

  await prisma.artTeamClearance.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
