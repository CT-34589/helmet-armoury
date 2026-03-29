import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  const ids: unknown = body?.ids
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Expected { ids: string[] }" }, { status: 400 })
  }

  await prisma.$transaction(
    (ids as string[]).map((id, index) =>
      prisma.helmetCategory.update({ where: { id }, data: { sortOrder: index } })
    )
  )

  revalidateTag("config", "max")
  return NextResponse.json({ ok: true })
}
