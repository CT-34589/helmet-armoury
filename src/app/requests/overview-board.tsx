"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { StatusBadge, StatusTracker } from "@/components/status-tracker"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import type { RequestStatus } from "@/lib/utils"
import { ChevronRight, Check, X, Paintbrush, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface Request {
  id: string
  helmetType: string
  decals: string[]
  designs: string[]
  visorColour?: string | null
  attachments: string[]
  battleDamage: boolean
  custom: boolean
  customDetails?: string | null
  evidenceUrl?: string | null
  evidenceNote?: string | null
  status: string
  artistId?: string | null
  completedImageUrl?: string | null
  internalNotes?: string | null
  declineReason?: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; name: string | null; image: string | null }
  artist?: { id: string; name: string | null; image: string | null } | null
}
interface Artist { id: string; name: string | null; image: string | null }

export function OverviewBoard({ requests: initial, artists, currentUserId }: {
  requests: Request[]
  artists: Artist[]
  currentUserId: string
}) {
  const [requests, setRequests] = useState(initial)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const es = new EventSource("/api/requests/stream")
    es.onmessage = (e) => {
      try {
        const updated: Request[] = JSON.parse(e.data)
        updated.forEach((r) => {
          if (!Array.isArray(r.decals)) r.decals = JSON.parse(r.decals as unknown as string ?? "[]")
          if (!Array.isArray(r.designs)) r.designs = JSON.parse(r.designs as unknown as string ?? "[]")
          if (!Array.isArray(r.attachments)) r.attachments = JSON.parse(r.attachments as unknown as string ?? "[]")
        })
        setRequests(updated)
      } catch {}
    }
    return () => es.close()
  }, [])

  const selected = requests.find((r) => r.id === selectedId) ?? null

  const mutate = async (id: string, body: Record<string, unknown>) => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        const safe = {
          ...updated,
          decals: Array.isArray(updated.decals) ? updated.decals : JSON.parse(updated.decals ?? "[]"),
          designs: Array.isArray(updated.designs) ? updated.designs : JSON.parse(updated.designs ?? "[]"),
          attachments: Array.isArray(updated.attachments) ? updated.attachments : JSON.parse(updated.attachments ?? "[]"),
        }
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...safe } : r))
      }
    } finally {
      setLoadingId(null)
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING")
  const waiting = requests.filter((r) => r.status === "ACCEPTED")
  const inProgress = requests.filter((r) => r.status === "IN_PROGRESS")

  return (
    <>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Art team request management</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Pending", value: pending.length, color: "text-yellow-500" },
            { label: "Awaiting Artist", value: waiting.length, color: "text-blue-400" },
            { label: "In Progress", value: inProgress.length, color: "text-foreground" },
            { label: "Total Open", value: pending.length + waiting.length + inProgress.length, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("text-2xl font-semibold mt-1", color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Kanban columns */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Submitted */}
          <Column title="Submitted" count={pending.length}>
            {pending.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoading={loadingId === r.id}
                onClick={() => setSelectedId(r.id)}
                footer={
                  <div className="flex gap-1.5 mt-2.5">
                    <Button
                      size="sm" className="flex-1 h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); mutate(r.id, { status: "ACCEPTED" }) }}
                    >
                      <Check className="h-3 w-3" />Accept
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="flex-1 h-7 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); mutate(r.id, { status: "DECLINED" }) }}
                    >
                      <X className="h-3 w-3" />Decline
                    </Button>
                  </div>
                }
              />
            ))}
            {pending.length === 0 && <EmptyCol label="No pending requests" />}
          </Column>

          {/* Waiting for Artist */}
          <Column title="Waiting for Artist" count={waiting.length}>
            {waiting.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoading={loadingId === r.id}
                onClick={() => setSelectedId(r.id)}
                footer={
                  <div className="space-y-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm" variant="outline" className="w-full h-7 text-xs"
                      onClick={() => mutate(r.id, { artistId: currentUserId, status: "IN_PROGRESS" })}
                    >
                      <Paintbrush className="h-3 w-3" />Claim
                    </Button>
                    <Select onValueChange={(v) => v && mutate(r.id, { artistId: v, status: "IN_PROGRESS" })}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Assign to…" />
                      </SelectTrigger>
                      <SelectContent>
                        {artists.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                }
              />
            ))}
            {waiting.length === 0 && <EmptyCol label="No requests awaiting assignment" />}
          </Column>

          {/* In Progress — grouped by artist */}
          <Column title="In Progress" count={inProgress.length}>
            {(() => {
              // Build artist groups from the requests themselves so former art team members still show
              const seen = new Set<string>()
              const artistGroups: { id: string; name: string | null; image: string | null }[] = []
              for (const r of inProgress) {
                if (r.artist && !seen.has(r.artist.id)) {
                  seen.add(r.artist.id)
                  artistGroups.push(r.artist)
                }
              }
              return artistGroups.map((artist) => {
                const reqs = inProgress.filter((r) => r.artistId === artist.id)
                return (
                  <div key={artist.id} className="space-y-2">
                    <Link
                      href={`/requests/artist/${artist.id}`}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={artist.image ?? ""} />
                        <AvatarFallback className="text-[10px]">{artist.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{artist.name}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">{reqs.length}</Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                    {reqs.map((r) => (
                      <RequestCard
                        key={r.id}
                        request={r}
                        isLoading={loadingId === r.id}
                        onClick={() => setSelectedId(r.id)}
                        compact
                      />
                    ))}
                  </div>
                )
              })
            })()}
            {inProgress.filter((r) => !r.artistId).map((r) => (
              <RequestCard key={r.id} request={r} isLoading={loadingId === r.id} onClick={() => setSelectedId(r.id)} />
            ))}
            {inProgress.length === 0 && <EmptyCol label="No requests in progress" />}
          </Column>
        </div>
      </div>

      {/* Detail sheet */}
      <RequestDetailSheet
        request={selected}
        artists={artists}
        currentUserId={currentUserId}
        isLoading={selected ? loadingId === selected.id : false}
        onClose={() => setSelectedId(null)}
        onMutate={mutate}
      />
    </>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        <Badge variant="secondary" className="text-xs px-1.5 py-0">{count}</Badge>
      </div>
      <div className="space-y-2 min-h-[60px]">{children}</div>
    </div>
  )
}

function EmptyCol({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed py-8 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function RequestCard({ request: r, isLoading, onClick, footer, compact }: {
  request: Request
  isLoading: boolean
  onClick: () => void
  footer?: React.ReactNode
  compact?: boolean
}) {
  return (
    <Card
      className={cn("cursor-pointer transition-colors hover:bg-muted/20", isLoading && "opacity-60")}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Avatar className="h-6 w-6 shrink-0 mt-0.5">
            <AvatarImage src={r.user.image ?? ""} />
            <AvatarFallback className="text-[10px]">{r.user.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-sm font-medium leading-tight truncate">{r.helmetType}</p>
              <StatusBadge status={r.status as RequestStatus} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              #{r.id.slice(-8)} · {r.user.name}
            </p>
            {!compact && (r.decals.length > 0 || r.designs.length > 0 || r.battleDamage || r.custom) && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {r.battleDamage && <Badge variant="outline" className="text-[10px] px-1 py-0">BD</Badge>}
                {r.custom && <Badge variant="outline" className="text-[10px] px-1 py-0">Custom</Badge>}
                {r.decals.length > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0">{r.decals.length} decal{r.decals.length !== 1 ? "s" : ""}</Badge>}
                {r.designs.length > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0">{r.designs.length} design{r.designs.length !== 1 ? "s" : ""}</Badge>}
              </div>
            )}
          </div>
          {isLoading && (
            <div className="w-3 h-3 border border-foreground border-t-transparent rounded-full animate-spin shrink-0 mt-1" />
          )}
        </div>
        {footer}
      </CardContent>
    </Card>
  )
}

/* ── Detail Sheet ───────────────────────────────────────── */

function RequestDetailSheet({ request: r, artists, currentUserId, isLoading, onClose, onMutate }: {
  request: Request | null
  artists: Artist[]
  currentUserId: string
  isLoading: boolean
  onClose: () => void
  onMutate: (id: string, body: Record<string, unknown>) => Promise<void>
}) {
  const [declineReason, setDeclineReason] = useState("")
  const [notes, setNotes] = useState("")

  // Sync local state when the selected request changes
  useEffect(() => {
    setNotes(r?.internalNotes ?? "")
    setDeclineReason("")
  }, [r?.id])

  return (
    <Sheet open={!!r} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        {r && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-3 pr-6">
                <div className="min-w-0">
                  <SheetTitle className="truncate">{r.helmetType}</SheetTitle>
                  <SheetDescription>
                    #{r.id.slice(-8)} · {r.user.name} · {formatDate(r.createdAt)}
                  </SheetDescription>
                </div>
                <StatusBadge status={r.status as RequestStatus} />
              </div>
              <div className="mt-3">
                <StatusTracker status={r.status as RequestStatus} />
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="px-6 py-5 space-y-6">

                {/* Request info */}
                <DetailSection title="Request Info">
                  <dl className="space-y-2">
                    <DetailRow label="Helmet Type" value={r.helmetType} />
                    {r.visorColour && <DetailRow label="Visor Colour" value={r.visorColour} />}
                    <DetailRow label="Battle Damage" value={r.battleDamage ? "Yes" : "No"} />
                    <DetailRow label="Custom" value={r.custom ? "Yes" : "No"} />
                    {r.customDetails && <DetailRow label="Custom Details" value={r.customDetails} />}
                    <DetailRow label="Artist" value={r.artist?.name ?? "Unassigned"} />
                    {r.declineReason && <DetailRow label="Decline Reason" value={r.declineReason} className="text-destructive" />}
                  </dl>
                </DetailSection>

                {/* Decals */}
                {r.decals.length > 0 && (
                  <DetailSection title={`Decals (${r.decals.length})`}>
                    <div className="flex flex-wrap gap-1.5">
                      {r.decals.map((d) => (
                        <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                      ))}
                    </div>
                  </DetailSection>
                )}

                {/* Designs */}
                {r.designs.length > 0 && (
                  <DetailSection title={`Designs (${r.designs.length})`}>
                    <div className="flex flex-wrap gap-1.5">
                      {r.designs.map((d) => (
                        <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                      ))}
                    </div>
                  </DetailSection>
                )}

                {/* Attachments */}
                {r.attachments.length > 0 && (
                  <DetailSection title={`Attachments (${r.attachments.length})`}>
                    <div className="flex flex-wrap gap-1.5">
                      {r.attachments.map((a) => (
                        <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                  </DetailSection>
                )}

                {/* Evidence */}
                {(r.evidenceUrl || r.evidenceNote) && (
                  <DetailSection title="Evidence">
                    {r.evidenceNote && (
                      <p className="text-sm text-muted-foreground italic mb-1">{r.evidenceNote}</p>
                    )}
                    {r.evidenceUrl && (
                      <a
                        href={r.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View in Discord
                      </a>
                    )}
                  </DetailSection>
                )}

                <Separator />

                {/* Actions */}
                <DetailSection title="Actions">
                  <div className="space-y-3">
                    {r.status === "PENDING" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm" className="flex-1"
                            disabled={isLoading}
                            onClick={() => onMutate(r.id, { status: "ACCEPTED" })}
                          >
                            <Check className="h-3.5 w-3.5" />Accept
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="flex-1 text-destructive hover:text-destructive"
                            disabled={isLoading}
                            onClick={() => onMutate(r.id, { status: "DECLINED", declineReason: declineReason || null })}
                          >
                            <X className="h-3.5 w-3.5" />Decline
                          </Button>
                        </div>
                        <Input
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          placeholder="Decline reason (optional)…"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}

                    {r.status === "ACCEPTED" && (
                      <div className="space-y-2">
                        <Button
                          size="sm" variant="outline" className="w-full"
                          disabled={isLoading}
                          onClick={() => onMutate(r.id, { artistId: currentUserId, status: "IN_PROGRESS" })}
                        >
                          <Paintbrush className="h-3.5 w-3.5" />Claim & Start
                        </Button>
                        <Select onValueChange={(v) => v && onMutate(r.id, { artistId: v, status: "IN_PROGRESS" })}>
                          <SelectTrigger><SelectValue placeholder="Assign to artist…" /></SelectTrigger>
                          <SelectContent>
                            {artists.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Internal notes — always visible */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-medium text-muted-foreground">Internal Notes</p>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes visible to art team only…"
                        rows={3}
                        className="resize-none text-sm"
                      />
                      <Button
                        size="sm" variant="outline" className="w-full"
                        disabled={isLoading}
                        onClick={() => onMutate(r.id, { internalNotes: notes })}
                      >
                        Save Notes
                      </Button>
                    </div>
                  </div>
                </DetailSection>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function DetailRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn("text-foreground", className)}>{value}</dd>
    </div>
  )
}
