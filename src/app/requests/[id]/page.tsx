import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"
import { notFound } from "next/navigation"
import { StatusTracker, StatusBadge } from "@/components/status-tracker"
import { formatDate } from "@/lib/utils"
import type { RequestStatus } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface Props { params: Promise<{ id: string }> }

export default async function RequestDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/")

  const { id } = await params
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, image: true } },
      artist: { select: { id: true, name: true } },
    },
  })

  if (!request) notFound()
  if (!session.user.isArtTeam && request.userId !== session.user.id) notFound()

  const labelMap = await getItemLabelMap()
  const decals = resolveLabels(JSON.parse(request.decals) as string[], labelMap)
  const designs = resolveLabels(JSON.parse(request.designs) as string[], labelMap)
  const attachments = resolveLabels(JSON.parse(request.attachments ?? "[]") as string[], labelMap)
  const visorColourLabel = request.visorColour ? (labelMap[request.visorColour] ?? request.visorColour) : null
  const helmetTypeLabel = labelMap[request.helmetType] ?? request.helmetType

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <Link
          href={session.user.isArtTeam ? "/requests" : "/armoury/me"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />Back
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Request #{request.id.slice(-8)}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{helmetTypeLabel}</h1>
            <p className="text-sm text-muted-foreground mt-1">{formatDate(request.createdAt)}</p>
          </div>
          <StatusBadge status={request.status as RequestStatus} />
        </div>
      </div>

      {/* Progress tracker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <StatusTracker status={request.status as RequestStatus} />
          {request.declineReason && (
            <p className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md px-3 py-2">
              Declined: {request.declineReason}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completed helmet image */}
      {request.completedImageUrl && (
        <Card className="overflow-hidden">
          <div className="relative bg-muted flex items-center justify-center" style={{ minHeight: 200 }}>
            <Image
              src={request.completedImageUrl}
              alt={helmetTypeLabel}
              width={400}
              height={400}
              className="object-contain max-h-64 w-auto"
            />
          </div>
          <Separator />
          <CardContent className="p-3 flex gap-2">
            <Button asChild className="flex-1" size="sm">
              <a href={request.completedImageUrl} download>
                <Download className="h-4 w-4" />Download Helmet
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={request.completedImageUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Request details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 text-sm">
          <Row label="Helmet Type" value={helmetTypeLabel} />
          {visorColourLabel && (
            <>
              <Separator />
              <Row label="Visor Colour" value={visorColourLabel} />
            </>
          )}
          <Separator />
          <Row label="Battle Damage" value={request.battleDamage ? "Yes" : "No"} />
          <Separator />
          <Row label="Custom" value={request.custom ? "Yes" : "No"} />
          {request.customDetails && (
            <>
              <Separator />
              <Row label="Custom Details" value={request.customDetails} />
            </>
          )}
          {decals.length > 0 && (
            <>
              <Separator />
              <div className="flex gap-4">
                <p className="text-muted-foreground w-28 shrink-0">Decals</p>
                <div className="flex flex-wrap gap-1">
                  {decals.map((d) => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                </div>
              </div>
            </>
          )}
          {designs.length > 0 && (
            <>
              <Separator />
              <div className="flex gap-4">
                <p className="text-muted-foreground w-28 shrink-0">Designs</p>
                <div className="flex flex-wrap gap-1">
                  {designs.map((d) => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                </div>
              </div>
            </>
          )}
          {attachments.length > 0 && (
            <>
              <Separator />
              <div className="flex gap-4">
                <p className="text-muted-foreground w-28 shrink-0">Attachments</p>
                <div className="flex flex-wrap gap-1">
                  {attachments.map((a) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}
                </div>
              </div>
            </>
          )}
          {(request.evidenceUrl || request.evidenceNote) && (
            <>
              <Separator />
              <div className="flex gap-4">
                <p className="text-muted-foreground w-28 shrink-0 mt-0.5">Evidence</p>
                <div className="space-y-1">
                  {request.evidenceNote && (
                    <p className="text-muted-foreground italic text-xs">{request.evidenceNote}</p>
                  )}
                  {request.evidenceUrl && (
                    <a
                      href={request.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-400 hover:underline text-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />View in Discord
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
          <Separator />
          <Row label="Artist" value={request.artist?.name ?? "Unassigned"} />
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <p className="text-muted-foreground w-28 shrink-0">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  )
}
