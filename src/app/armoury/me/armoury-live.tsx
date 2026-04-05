"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, StatusTracker } from "@/components/status-tracker"
import { formatDate } from "@/lib/utils"
import type { RequestStatus } from "@/lib/utils"
import { CompletedTable } from "./completed-table"

interface ActiveRequest {
  id: string; helmetType: string; status: string
  artistName: string | null; declineReason: string | null
  createdAt: string; updatedAt: string
}
interface CompletedRequest {
  id: string; helmetType: string; artistName: string | null
  completedImageUrl: string | null; createdAt: string
  decals: string[]; designs: string[]; visorColour: string | null
  attachments: string[]; battleDamage: boolean; custom: boolean; customDetails: string | null
}
interface DeclinedRequest {
  id: string; helmetType: string; createdAt: string; declineReason: string | null
}

interface Props {
  initialActive: ActiveRequest[]
  initialCompleted: CompletedRequest[]
  initialDeclined: DeclinedRequest[]
  isBlacklisted: boolean
}

export function ArmouryLive({ initialActive, initialCompleted, initialDeclined, isBlacklisted }: Props) {
  const [active, setActive] = useState(initialActive)
  const [completed, setCompleted] = useState(initialCompleted)
  const [declined, setDeclined] = useState(initialDeclined)

  useEffect(() => {
    const es = new EventSource("/api/requests/stream/me")
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setActive(data.active ?? [])
        setCompleted(data.completed ?? [])
        setDeclined(data.declined ?? [])
      } catch {}
    }
    return () => es.close()
  }, [])

  const total = active.length + completed.length + declined.length

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Armoury</h1>
          <p className="text-sm text-muted-foreground">
            {completed.length} helmet{completed.length !== 1 ? "s" : ""} completed
          </p>
        </div>
        {!isBlacklisted && (
          <Button asChild size="sm">
            <Link href="/request"><Plus className="h-4 w-4" />New Request</Link>
          </Button>
        )}
      </div>

      {isBlacklisted && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Your account has been blacklisted. You cannot submit new requests.
        </div>
      )}

      {/* Active requests */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active</h2>
          <div className="space-y-3">
            {active.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">{r.helmetType}</p>
                      <p className="text-xs text-muted-foreground">
                        #{r.id.slice(-8)} · {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status as RequestStatus} />
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link href={`/requests/${r.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                  <StatusTracker status={r.status as RequestStatus} />
                  {r.artistName && (
                    <p className="text-xs text-muted-foreground">Artist: {r.artistName}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Completed — {completed.length}
          </h2>
          <CompletedTable requests={completed} />
        </div>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Declined</h2>
          <div className="space-y-2">
            {declined.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{r.helmetType}</p>
                    <p className="text-xs text-muted-foreground">
                      #{r.id.slice(-8)} · {formatDate(r.createdAt)}
                      {r.declineReason && ` · ${r.declineReason}`}
                    </p>
                  </div>
                  <StatusBadge status="DECLINED" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm mb-4">No requests yet.</p>
          <Button asChild size="sm">
            <Link href="/request"><Plus className="h-4 w-4" />Make your first request</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
