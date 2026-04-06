import { NextResponse } from "next/server"
import { unlink } from "fs/promises"
import { join } from "path"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveHelmetCooldownType } from "@/lib/cooldown"
import { sendPushToUser } from "@/lib/web-push"
import { publishSseEvent } from "@/lib/sse-bus"

const PUBLIC_PREFIX = process.env.UPLOAD_PUBLIC_PREFIX ?? "/uploads/helmets"
const getUploadDir = () => process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads", "helmets")

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.artTeamTier !== "head") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const request = await prisma.request.findUnique({ where: { id }, select: { id: true, completedImageUrl: true } })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete the image file from disk if present
  if (request.completedImageUrl?.startsWith(PUBLIC_PREFIX)) {
    const filename = request.completedImageUrl.slice(PUBLIC_PREFIX.length + 1)
    try { await unlink(join(getUploadDir(), filename)) } catch { /* already gone */ }
  }

  await prisma.request.delete({ where: { id } })
  void publishSseEvent("art-team")
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.isArtTeam) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const allowedKeys = [
    "status", "artistId", "completedImageUrl",
    "internalNotes", "declineReason",
  ]
  const bodyObj = body as Record<string, unknown>
  const data: Record<string, unknown> = {}
  for (const key of allowedKeys) {
    if (key in bodyObj) data[key] = bodyObj[key]
  }

  // When marking COMPLETED, snapshot completedAt + cooldownType
  if (bodyObj.status === "COMPLETED") {
    const req = await prisma.request.findUnique({
      where: { id },
      select: { helmetType: true, userId: true, direct: true },
    })
    if (req && !req.direct) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { kmcRoles: true },
      })
      const kmcRoles = JSON.parse(user?.kmcRoles ?? "[]") as string[]
      data.completedAt = new Date()
      data.cooldownType = await resolveHelmetCooldownType(req.helmetType, kmcRoles)
    }
  }

  const updated = await prisma.request.update({ where: { id }, data })

  const notifyMap: Record<string, { title: string; body: string }> = {
    ACCEPTED:    { title: "Request Accepted", body: "Your helmet request has been accepted by the Art Team." },
    IN_PROGRESS: { title: "Helmet In Progress", body: "An artist has been assigned and is working on your helmet." },
    COMPLETED:   { title: "Helmet Ready!", body: "Your helmet has been completed. Check your armoury!" },
    DECLINED:    { title: "Request Declined", body: "Your helmet request has been declined." },
  }
  const notify = typeof bodyObj.status === "string" ? notifyMap[bodyObj.status] : undefined
  if (notify) void sendPushToUser(updated.userId, { ...notify, url: "/armoury/me" })

  void publishSseEvent("art-team")
  void publishSseEvent("user", updated.userId)

  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, image: true } },
      artist: { select: { id: true, name: true } },
    },
  })

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!session.user.isArtTeam && request.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    ...request,
    decals: JSON.parse(request.decals),
    designs: JSON.parse(request.designs),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  })
}
