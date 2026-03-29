import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { category, subCategory, helmetCategory, name, label, requirement, rankReq, note } = await req.json()
  if (!category || !name || !label) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const last = await prisma.configItem.findFirst({
    where: { category, subCategory: subCategory || null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })
  const sortOrder = (last?.sortOrder ?? -1) + 1

  const item = await prisma.configItem.create({
    data: {
      category,
      subCategory: subCategory || null,
      helmetCategory: helmetCategory || null,
      name,
      label,
      requirement: requirement || null,
      rankReq: rankReq || null,
      note: note || null,
      sortOrder,
    },
  })
  revalidateTag("config", "max")
  return NextResponse.json({ ...item, createdAt: item.createdAt.toISOString() }, { status: 201 })
}
