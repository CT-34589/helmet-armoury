import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const settings = await prisma.systemSetting.findMany()
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  return NextResponse.json(map)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 })

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  })
  return NextResponse.json(setting)
}
