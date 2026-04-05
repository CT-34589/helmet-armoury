import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"
import { ArmouryLive } from "./armoury-live"

export default async function MyArmouryPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const [requests, labelMap] = await Promise.all([
    prisma.request.findMany({
      where: { userId: session.user.id, direct: false },
      include: { artist: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getItemLabelMap(),
  ])

  const active = requests
    .filter((r) => !["COMPLETED", "DECLINED"].includes(r.status))
    .map((r) => ({
      id: r.id,
      helmetType: labelMap[r.helmetType] ?? r.helmetType,
      status: r.status,
      artistName: r.artist?.name ?? null,
      declineReason: r.declineReason ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))

  const completed = requests
    .filter((r) => r.status === "COMPLETED")
    .map((r) => ({
      id: r.id,
      helmetType: labelMap[r.helmetType] ?? r.helmetType,
      artistName: r.artist?.name ?? null,
      completedImageUrl: r.completedImageUrl,
      createdAt: r.createdAt.toISOString(),
      decals: resolveLabels(JSON.parse(r.decals) as string[], labelMap),
      designs: resolveLabels(JSON.parse(r.designs) as string[], labelMap),
      visorColour: r.visorColour ? (labelMap[r.visorColour] ?? r.visorColour) : null,
      attachments: resolveLabels(JSON.parse(r.attachments ?? "[]") as string[], labelMap),
      battleDamage: r.battleDamage,
      custom: r.custom,
      customDetails: r.customDetails,
    }))

  const declined = requests
    .filter((r) => r.status === "DECLINED")
    .map((r) => ({
      id: r.id,
      helmetType: labelMap[r.helmetType] ?? r.helmetType,
      createdAt: r.createdAt.toISOString(),
      declineReason: r.declineReason ?? null,
    }))

  return (
    <ArmouryLive
      initialActive={active}
      initialCompleted={completed}
      initialDeclined={declined}
      isBlacklisted={session.user.isBlacklisted ?? false}
    />
  )
}
