import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DirectAddForm } from "./direct-add-form"
import { Card, CardContent } from "@/components/ui/card"

export default async function DirectAddPage() {
  const session = await auth()
  if (!session?.user?.isArtTeam) redirect("/armoury/me")

  // Only SAT+ (senior, head, primary) can direct-add
  const allowedTiers = ["head", "senior", "primary"]
  if (!session.user.artTeamTier || !allowedTiers.includes(session.user.artTeamTier)) {
    redirect("/armoury/all")
  }

  const [users, configItems] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, image: true, discordId: true },
      orderBy: { name: "asc" },
    }),
    prisma.configItem.findMany({
      where: { active: true, category: "helmetType" },
      orderBy: [{ helmetCategory: "asc" }, { sortOrder: "asc" }],
    }),
  ])

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Add Helmet Directly</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a completed helmet to a trooper's armoury without them making a request.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <DirectAddForm
            users={users}
            helmetTypes={configItems.map((h) => ({ name: h.name, label: h.label, helmetCategory: h.helmetCategory }))}
            addedById={session.user.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
