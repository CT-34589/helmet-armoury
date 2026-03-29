import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const SAT_ADMIN = ["head", "senior"]

const schema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and underscores only"),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const clearances = await prisma.artTeamClearance.findMany({ orderBy: { createdAt: "asc" } })
  return NextResponse.json(
    clearances.map((c) => ({
      ...c,
      memberIds: JSON.parse(c.memberIds) as string[],
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!SAT_ADMIN.includes(session?.user?.artTeamTier ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, label, description } = parsed.data

  const clearance = await prisma.artTeamClearance.create({
    data: { name, label, description: description ?? null },
  })

  return NextResponse.json({
    ...clearance,
    memberIds: [] as string[],
    createdAt: clearance.createdAt.toISOString(),
    updatedAt: clearance.updatedAt.toISOString(),
  })
}
