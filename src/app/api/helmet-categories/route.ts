import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const cats = await prisma.helmetCategory.findMany({ orderBy: { sortOrder: "asc" } })
  return NextResponse.json(cats)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const { name } = body as { name?: string }
  if (!name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 })

  try {
    const cat = await prisma.helmetCategory.create({ data: { name: name.trim() } })
    revalidateTag("config", "max")
    return NextResponse.json(cat, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 })
  }
}
