import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getActiveConfigItems, getArtTeamMembers, getHelmetCategories } from "@/lib/cached-queries"
import { checkUserCooldown } from "@/lib/cooldown"
import { RequestForm } from "./request-form"
import { Card, CardContent } from "@/components/ui/card"

export default async function RequestPage() {
  const session = await auth()
  if (!session?.user) redirect("/")
  if (session.user.isBlacklisted) redirect("/armoury/me")

  // Check for existing open request — lock if one exists
  const openRequest = await prisma.request.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
      direct: false,
    },
    select: { id: true, status: true, helmetType: true },
  })

  if (openRequest) {
    return (
      <div className="max-w-2xl animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">New Request</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="font-medium">You already have an open request</p>
            <p className="text-sm text-muted-foreground">
              Your <span className="text-foreground font-medium">{openRequest.helmetType}</span> request
              is currently <span className="text-foreground">{openRequest.status.replace("_", " ").toLowerCase()}</span>.
              You can only have one active request at a time.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Cooldown check
  const cooldown = await checkUserCooldown(session.user.id)
  if (cooldown.active && cooldown.availableAt) {
    const typeLabel = cooldown.type === "custom" ? "Custom Helmet" : "Decaled Helmet"
    const available = cooldown.availableAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    return (
      <div className="max-w-2xl animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">New Request</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="font-medium">You are in a cooldown period</p>
            <p className="text-sm text-muted-foreground">
              Your last <span className="text-foreground">{typeLabel}</span> was recently completed.
              You can submit a new request on{" "}
              <span className="text-foreground font-medium">{available}</span>
              {cooldown.daysRemaining !== undefined && (
                <> ({cooldown.daysRemaining} day{cooldown.daysRemaining !== 1 ? "s" : ""} remaining)</>
              )}.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check requests open/closed + custom message
  let requestsOpen = true
  let closeMessage = "The Art Team is not accepting new helmet requests at this time. Check back later."
  try {
    const [openSetting, msgSetting] = await Promise.all([
      (prisma as any).systemSetting.findUnique({ where: { key: "requests_open" } }),
      (prisma as any).systemSetting.findUnique({ where: { key: "requests_close_message" } }),
    ])
    requestsOpen = openSetting ? openSetting.value === "true" : true
    if (msgSetting?.value) closeMessage = msgSetting.value
  } catch {}

  if (!requestsOpen) {
    return (
      <div className="max-w-2xl animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">New Request</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="font-medium">Requests are currently closed</p>
            <p className="text-sm text-muted-foreground">{closeMessage}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [configItems, artTeamMembers, helmetCategories] = await Promise.all([
    getActiveConfigItems(),
    getArtTeamMembers(),
    getHelmetCategories(),
  ])

  // Build clearance map for helmet categories
  const catClearanceMap = new Map(helmetCategories.map((c) => [c.name, c.clearance ?? null]))
  const userClearances = session.user.clearances ?? []

  // Role-based filtering — combine main guild and KMC roles
  const userRoles = [...(session.user.discordRoles ?? []), ...(session.user.kmcRoles ?? [])]
  const visibleItems = configItems.filter((item) => {
    const allowedIds = JSON.parse(item.allowedRoleIds) as string[]
    if (allowedIds.length > 0 && !allowedIds.some((id) => userRoles.includes(id))) return false
    // Clearance gate: if the item's helmet category requires a clearance, user must have it
    if (item.category === "helmetType" && item.helmetCategory) {
      const required = catClearanceMap.get(item.helmetCategory)
      if (required && !userClearances.includes(required)) return false
    }
    return true
  })

  const helmetTypes = visibleItems
    .filter((c) => c.category === "helmetType")
    .map((h) => ({ name: h.name, label: h.label, helmetCategory: h.helmetCategory }))

  const decals = visibleItems
    .filter((c) => c.category === "decal")
    .map((d) => ({ value: d.name, label: d.label, subCategory: d.subCategory ?? undefined, requirement: d.requirement ?? undefined }))

  const designs = visibleItems
    .filter((c) => c.category === "design")
    .map((d) => ({ value: d.name, label: d.label, subCategory: d.subCategory ?? undefined, requirement: d.requirement ?? undefined }))

  const visorColours = visibleItems
    .filter((c) => c.category === "visorColour")
    .map((v) => ({ name: v.name, label: v.label, requirement: v.requirement ?? undefined }))

  const attachments = visibleItems
    .filter((c) => c.category === "attachment")
    .map((a) => ({ value: a.name, label: a.label, requirement: a.requirement ?? undefined }))

  const isSAT = session.user.artTeamTier && ["head", "senior", "primary"].includes(session.user.artTeamTier)
  const customHelmetRoleIds = (process.env.DISCORD_CUSTOM_HELMET_ROLE_IDS ?? "")
    .split(",").map((id) => id.trim()).filter(Boolean)
  const hasCustomHelmetAccess =
    isSAT ||
    customHelmetRoleIds.length === 0 ||
    customHelmetRoleIds.some((id) => userRoles.includes(id))

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New Request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill out the form below. Evidence is sent to the Art Team Discord channel automatically on submission.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <RequestForm
            helmetTypes={helmetTypes}
            decals={decals}
            designs={designs}
            visorColours={visorColours}
            attachments={attachments}
            artTeamMembers={artTeamMembers}
            hasCustomHelmetAccess={!!hasCustomHelmetAccess}
          />
        </CardContent>
      </Card>
    </div>
  )
}
