import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const ALLOWED_TIERS = ["head", "senior", "primary"]

const schema = z.object({
  userId: z.string().min(1),
  helmetType: z.string().min(1),
  completedImageUrl: z.string().min(1),
  decals: z.array(z.string()).default([]),
  designs: z.array(z.string()).default([]),
  visorColour: z.string().nullable().optional(),
  attachments: z.array(z.string()).default([]),
  battleDamage: z.boolean().default(false),
  custom: z.boolean().default(false),
  customDetails: z.string().nullable().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isArtTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (!session.user.artTeamTier || !ALLOWED_TIERS.includes(session.user.artTeamTier)) {
    return NextResponse.json({ error: "Insufficient tier — SAT+ required" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
  }

  const { userId, helmetType, completedImageUrl, decals, designs, visorColour, attachments, battleDamage, custom, customDetails } = parsed.data

  const request = await prisma.request.create({
    data: {
      userId,
      helmetType,
      completedImageUrl,
      decals: JSON.stringify(decals),
      designs: JSON.stringify(designs),
      visorColour: visorColour ?? null,
      attachments: JSON.stringify(attachments),
      battleDamage,
      custom,
      customDetails: custom ? (customDetails ?? null) : null,
      status: "COMPLETED",
      direct: true,
      addedById: session.user.id,
      artistId: session.user.id,
    },
  })

  return NextResponse.json(request, { status: 201 })
}
