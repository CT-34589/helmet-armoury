"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { HelmetImageUpload } from "@/components/helmet-image-upload"
import { formatDate } from "@/lib/utils"
import { CheckCircle2, ExternalLink } from "lucide-react"

interface MyRequest {
  id: string
  helmetType: string
  userName: string | null
  userImage: string | null
  createdAt: string
  decals: string[]
  designs: string[]
  visorColour: string | null
  attachments: string[]
  battleDamage: boolean
  custom: boolean
  customDetails: string | null
  evidenceUrl: string | null
  evidenceNote: string | null
  internalNotes: string | null
}

export function MyRequestsTable({ requests: initial, currentUserId }: { requests: MyRequest[]; currentUserId: string }) {
  const [requests, setRequests] = useState(initial)
  const [selected, setSelected] = useState<MyRequest | null>(null)

  useEffect(() => {
    const es = new EventSource("/api/requests/stream")
    es.onmessage = (e) => {
      try {
        const all: Array<{ id: string; artistId?: string | null; status: string; helmetType: string; user: { id: string; name: string | null; image: string | null }; decals: string[]; designs: string[]; visorColour?: string | null; attachments: string[]; battleDamage: boolean; custom: boolean; customDetails?: string | null; evidenceUrl?: string | null; evidenceNote?: string | null; internalNotes?: string | null; createdAt: string }> = JSON.parse(e.data)
        setRequests(
          all
            .filter((r) => r.artistId === currentUserId && r.status === "IN_PROGRESS")
            .map((r) => ({
              id: r.id,
              helmetType: r.helmetType,
              userName: r.user.name,
              userImage: r.user.image,
              createdAt: r.createdAt,
              decals: r.decals,
              designs: r.designs,
              visorColour: r.visorColour ?? null,
              attachments: r.attachments,
              battleDamage: r.battleDamage,
              custom: r.custom,
              customDetails: r.customDetails ?? null,
              evidenceUrl: r.evidenceUrl ?? null,
              evidenceNote: r.evidenceNote ?? null,
              internalNotes: r.internalNotes ?? null,
            }))
        )
      } catch {}
    }
    return () => es.close()
  }, [currentUserId])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [completing, setCompleting] = useState(false)

  const openSheet = (r: MyRequest) => {
    setSelected(r)
    setImageUrl(null)
    setNotes(r.internalNotes ?? "")
  }

  const markComplete = async () => {
    if (!selected || !imageUrl) return
    setCompleting(true)
    try {
      const res = await fetch(`/api/requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          completedImageUrl: imageUrl,
          internalNotes: notes || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Marked as complete!")
      setRequests((prev) => prev.filter((r) => r.id !== selected.id))
      setSelected(null)
    } catch {
      toast.error("Failed to mark as complete")
    } finally {
      setCompleting(false)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground text-sm">No requests currently assigned to you.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Helmet Type</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Request Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => openSheet(r)}>
                <TableCell className="font-medium text-sm">{r.helmetType}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={r.userImage ?? ""} />
                      <AvatarFallback className="text-[10px]">{r.userName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{r.userName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                <div className="flex items-start gap-3 pr-6">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={selected.userImage ?? ""} />
                    <AvatarFallback className="text-xs">{selected.userName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>{selected.helmetType}</SheetTitle>
                    <SheetDescription>
                      {selected.userName} · #{selected.id.slice(-8)} · {formatDate(selected.createdAt)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {/* Details */}
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request Details</p>
                  {selected.battleDamage && (
                    <div className="flex gap-4">
                      <p className="text-muted-foreground w-28 shrink-0">Battle Damage</p>
                      <p>Yes</p>
                    </div>
                  )}
                  {selected.visorColour && (
                    <div className="flex gap-4">
                      <p className="text-muted-foreground w-28 shrink-0">Visor Colour</p>
                      <p>{selected.visorColour}</p>
                    </div>
                  )}
                  {selected.custom && (
                    <div className="flex gap-4">
                      <p className="text-muted-foreground w-28 shrink-0">Custom</p>
                      <p className="text-muted-foreground italic">{selected.customDetails ?? "Yes"}</p>
                    </div>
                  )}
                  {(selected.evidenceNote || selected.evidenceUrl) && (
                    <div className="flex gap-4">
                      <p className="text-muted-foreground w-28 shrink-0">Evidence</p>
                      <div className="space-y-0.5">
                        {selected.evidenceNote && (
                          <p className="text-muted-foreground italic text-xs">{selected.evidenceNote}</p>
                        )}
                        {selected.evidenceUrl && (
                          <a href={selected.evidenceUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />View evidence
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selected.decals.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Decals ({selected.decals.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selected.decals.map((d) => (
                          <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selected.designs.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Designs ({selected.designs.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selected.designs.map((d) => (
                          <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selected.attachments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Attachments ({selected.attachments.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selected.attachments.map((d) => (
                          <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Completed Helmet Image
                  </Label>
                  <HelmetImageUpload onUpload={setImageUrl} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Internal Notes
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes visible to art team only…"
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t shrink-0 space-y-2">
                <Button
                  className="w-full"
                  onClick={markComplete}
                  disabled={completing || !imageUrl}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completing ? "Marking complete…" : "Mark as Complete"}
                </Button>
                {!imageUrl && (
                  <p className="text-xs text-muted-foreground text-center">
                    Upload the completed helmet image to continue
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
