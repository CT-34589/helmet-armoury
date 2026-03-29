import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const { name, clearance } = body as { name?: string; clearance?: string | null }
  if (name !== undefined && !name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 })

  const existing = await prisma.helmetCategory.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name.trim()
  if (clearance !== undefined) updateData.clearance = clearance || null

  try {
    const cat = await prisma.helmetCategory.update({ where: { id }, data: updateData })

    // Cascade rename to all ConfigItems that reference the old name
    if (name !== undefined && existing.name !== name.trim()) {
      await prisma.configItem.updateMany({
        where: { helmetCategory: existing.name },
        data: { helmetCategory: name.trim() },
      })
    }

    revalidateTag("config", "max")
    return NextResponse.json(cat)
  } catch {
    return NextResponse.json({ error: "Name already taken" }, { status: 409 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  const existing = await prisma.helmetCategory.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Clear this category from any ConfigItems that reference it
  await prisma.configItem.updateMany({
    where: { helmetCategory: existing.name },
    data: { helmetCategory: null },
  })

  await prisma.helmetCategory.delete({ where: { id } })
  revalidateTag("config", "max")
  return NextResponse.json({ ok: true })
}
