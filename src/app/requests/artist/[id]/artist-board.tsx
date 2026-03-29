"use client"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, StickyNote } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { HelmetImageUpload } from "@/components/helmet-image-upload"
import { formatDate } from "@/lib/utils"

interface Request {
  id: string; helmetType: string; decals: string[]; designs: string[]
  battleDamage: boolean; custom: boolean; customDetails?: string | null
  evidenceUrl?: string | null; evidenceNote?: string | null
  status: string; completedImageUrl?: string | null
  internalNotes?: string | null; createdAt: string; updatedAt: string
  user: { id: string; name: string | null; image: string | null }
}
interface Artist { id: string; name: string | null; image: string | null }

export function ArtistBoard({ artist, requests: initial }: { artist: Artist; requests: Request[] }) {
  const [requests, setRequests] = useState(initial)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((r) => [r.id, r.internalNotes ?? ""]))
  )

  const mutate = async (id: string, body: Record<string, unknown>) => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r).filter((r) => r.status === "IN_PROGRESS"))
      }
    } finally { setLoadingId(null) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link href="/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />Back to Overview
        </Link>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={artist.image ?? ""} />
            <AvatarFallback>{artist.name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{artist.name}</h1>
            <p className="text-sm text-muted-foreground">{requests.length} active request{requests.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-md border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">No active requests for this artist.</p>
          <Button variant="link" asChild className="mt-2"><Link href="/requests">Back to overview</Link></Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {requests.map((r) => (
            <Card key={r.id} className={loadingId === r.id ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={r.user.image ?? ""} />
                      <AvatarFallback className="text-[10px]">{r.user.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">{r.helmetType}</CardTitle>
                      <p className="text-xs text-muted-foreground">{r.user.name} · {formatDate(r.createdAt)}</p>
                    </div>
                  </div>
                  {loadingId === r.id && (
                    <div className="w-3 h-3 border border-foreground border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.battleDamage && <Badge variant="outline" className="text-[10px]">Battle Damage</Badge>}
                  {r.custom && <Badge variant="outline" className="text-[10px]">Custom</Badge>}
                  {r.decals.map((d) => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}
                  {r.designs.map((d) => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}
                </div>
                {r.customDetails && (
                  <p className="text-xs text-muted-foreground border rounded-md px-2.5 py-1.5 mt-1">{r.customDetails}</p>
                )}
                {(r.evidenceUrl || r.evidenceNote) && (
                  <div className="mt-1 space-y-0.5">
                    {r.evidenceNote && <p className="text-xs text-muted-foreground italic">{r.evidenceNote}</p>}
                    {r.evidenceUrl && (
                      <a href={r.evidenceUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1">
                        View evidence in Discord
                      </a>
                    )}
                  </div>
                )}
              </CardHeader>

              <Separator />

              <CardContent className="pt-3 space-y-3">
                {/* Image upload — processed & saved locally */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Completed Helmet Image</Label>
                  <HelmetImageUpload
                    existing={r.completedImageUrl}
                    onUpload={(url) => setUploadedUrls((prev) => ({ ...prev, [r.id]: url }))}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Internal Notes</Label>
                  <Textarea
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Internal notes (not shown to user)…"
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs"
                    disabled={!uploadedUrls[r.id] || loadingId === r.id}
                    onClick={() => mutate(r.id, {
                      status: "COMPLETED",
                      completedImageUrl: uploadedUrls[r.id],
                      internalNotes: notes[r.id],
                    })}>
                    <Check className="h-3 w-3" />Mark Complete
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    onClick={() => mutate(r.id, { internalNotes: notes[r.id] })} disabled={loadingId === r.id}>
                    <StickyNote className="h-3 w-3" />Save Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
