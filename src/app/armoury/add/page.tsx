import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DirectAddForm } from "./direct-add-form"
import { Card, CardContent } from "@/components/ui/card"

export default async function DirectAddPage() {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")

  const allowedTiers = ["head", "senior", "primary"]
  if (!session.user.artTeamTier || !allowedTiers.includes(session.user.artTeamTier)) {
    redirect("/armoury/all")
  }

  const [users, configItems, helmetCategories] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, image: true },
      orderBy: { name: "asc" },
    }),
    prisma.configItem.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.helmetCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ])

  const helmetTypes = configItems
    .filter((c) => c.category === "helmetType")
    .map((h) => ({ name: h.name, label: h.label, helmetCategory: h.helmetCategory }))

  const decals = configItems
    .filter((c) => c.category === "decal")
    .map((d) => ({ value: d.name, label: d.label, subCategory: d.subCategory ?? undefined, requirement: d.requirement ?? undefined }))

  const designs = configItems
    .filter((c) => c.category === "design")
    .map((d) => ({ value: d.name, label: d.label, subCategory: d.subCategory ?? undefined, requirement: d.requirement ?? undefined }))

  const visorColours = configItems
    .filter((c) => c.category === "visorColour")
    .map((v) => ({ name: v.name, label: v.label }))

  const attachments = configItems
    .filter((c) => c.category === "attachment")
    .map((a) => ({ value: a.name, label: a.label }))

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Add Helmet Directly</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a completed helmet to a trooper's armoury. All options available — no slot limits apply.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <DirectAddForm
            users={users}
            helmetTypes={helmetTypes}
            decals={decals}
            designs={designs}
            visorColours={visorColours}
            attachments={attachments}
            addedById={session.user.id}
            categoryOrder={helmetCategories.map((c) => c.name)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
