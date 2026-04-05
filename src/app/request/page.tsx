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
  if (session.user.armouryOnly) redirect("/armoury/me")

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

  // Eligibility check — must hold a request-eligible role (e.g. CT+) unless art team
  if (!session.user.isArtTeam) {
    try {
      const eligibleSetting = await (prisma as any).systemSetting.findUnique({ where: { key: "request_eligible_role_ids" } })
      const eligibleRoleIds = (eligibleSetting?.value ?? "").split(",").map((s: string) => s.trim()).filter(Boolean)
      if (eligibleRoleIds.length > 0) {
        const userRolesFull = [...(session.user.discordRoles ?? []), ...(session.user.kmcRoles ?? [])]
        if (!eligibleRoleIds.some((id: string) => userRolesFull.includes(id))) {
          return (
            <div className="max-w-2xl animate-fade-in">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">New Request</h1>
              </div>
              <Card>
                <CardContent className="p-8 text-center space-y-2">
                  <p className="font-medium">You are not eligible to submit a request</p>
                  <p className="text-sm text-muted-foreground">
                    You must be CT or higher to request a helmet.
                  </p>
                </CardContent>
              </Card>
            </div>
          )
        }
      }
    } catch {}
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
    .map((h) => ({ name: h.name, label: h.label, helmetCategory: h.helmetCategory, standard: h.standard ?? true }))

  const decals = visibleItems
    .filter((c) => c.category === "decal")
    .map((d) => ({ value: d.name, label: d.label, subCategory: d.subCategory ?? undefined, requirement: d.requirement ?? undefined, slotWeight: d.slotWeight ?? 1 }))

  const designs = visibleItems
    .filter((c) => c.category === "design")
    .map((d) => ({ value: d.name, label: d.label, subCategory: d.subCategory ?? undefined, requirement: d.requirement ?? undefined, slotWeight: d.slotWeight ?? 1 }))

  const visorColours = visibleItems
    .filter((c) => c.category === "visorColour")
    .map((v) => ({ name: v.name, label: v.label, requirement: v.requirement ?? undefined }))

  const attachments = visibleItems
    .filter((c) => c.category === "attachment")
    .map((a) => ({ value: a.name, label: a.label, requirement: a.requirement ?? undefined }))

  const isSAT = session.user.artTeamTier && ["head", "senior", "primary"].includes(session.user.artTeamTier)

  // Load settings and compute slot limits for this user's rank
  let settingsMap: Record<string, string> = {}
  try {
    const rows = await (prisma as any).systemSetting.findMany()
    settingsMap = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]))
  } catch {}

  // Slot limits: only SGM+ rank gets unlimited. Cadre/Head Cadre still use their rank's slot tier.
  const kmcRolesForSlots = session.user.discordRoles ?? []
  const slotIds = (key: string) =>
    (settingsMap[key] ?? "").split(",").map((s) => s.trim()).filter(Boolean)

  // SGM+ role IDs — reuse the cooldown rank config, fall back to env var
  const sgmPlusRoleIds = slotIds("cooldown_rank_sgm_plus_role_ids").length > 0
    ? slotIds("cooldown_rank_sgm_plus_role_ids")
    : (process.env.KMC_SGM_PLUS_ROLE_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean)

  // Custom elements access — SGM+ in the config page rank tiers, or SAT
  const hasCustomHelmetAccess =
    !!isSAT ||
    (sgmPlusRoleIds.length > 0 && sgmPlusRoleIds.some((id) => userRoles.includes(id)))

  // Standard slot limits
  let decalSlotLimit = 0
  let designSlotLimit = 0

  const isSgmPlus = sgmPlusRoleIds.some((id) => kmcRolesForSlots.includes(id))

  if (!isSgmPlus) {
    // Not SGM+ rank → determine slot tier from rank roles (Cadre/Head Cadre fall through here too)
    let slotTier = "ct_po"
    if (slotIds("slot_rank_sgt_fcpt_role_ids").some((id) => kmcRolesForSlots.includes(id)))     slotTier = "sgt_fcpt"
    else if (slotIds("slot_rank_cpl_flt_role_ids").some((id) => kmcRolesForSlots.includes(id))) slotTier = "cpl_flt"
    else if (slotIds("slot_rank_lcpl_fo_role_ids").some((id) => kmcRolesForSlots.includes(id))) slotTier = "lcpl_fo"

    decalSlotLimit  = parseInt(settingsMap[`slots_decals_${slotTier}`]  ?? "0", 10)
    designSlotLimit = parseInt(settingsMap[`slots_designs_${slotTier}`] ?? "0", 10)
  }

  // Non-standard slot limits — same tier detection as standard; SGM+ is unlimited (0)
  let nonStandardDecalLimit = 0
  let nonStandardDesignLimit = 0

  if (!isSgmPlus) {
    let nsSlotTier = "ct_po"
    if (slotIds("slot_rank_sgt_fcpt_role_ids").some((id) => kmcRolesForSlots.includes(id)))     nsSlotTier = "sgt_fcpt"
    else if (slotIds("slot_rank_cpl_flt_role_ids").some((id) => kmcRolesForSlots.includes(id))) nsSlotTier = "cpl_flt"
    else if (slotIds("slot_rank_lcpl_fo_role_ids").some((id) => kmcRolesForSlots.includes(id))) nsSlotTier = "lcpl_fo"

    nonStandardDecalLimit  = parseInt(settingsMap[`slots_nonstandard_decals_${nsSlotTier}`]  ?? "2", 10)
    nonStandardDesignLimit = parseInt(settingsMap[`slots_nonstandard_designs_${nsSlotTier}`] ?? "1", 10)
  }

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
            standardDecalLimit={decalSlotLimit}
            standardDesignLimit={designSlotLimit}
            nonStandardDecalLimit={nonStandardDecalLimit}
            nonStandardDesignLimit={nonStandardDesignLimit}
            categoryOrder={helmetCategories.map((c) => c.name)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
