"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, StatusTracker } from "@/components/status-tracker"
import { formatDate } from "@/lib/utils"
import type { RequestStatus } from "@/lib/utils"

interface ActiveRequest {
  id: string
  helmetType: string
  status: string
  artistName: string | null
  declineReason: string | null
  createdAt: string
  updatedAt: string
}

export function ActiveRequestTracker({ initialRequests }: { initialRequests: ActiveRequest[] }) {
  const [requests, setRequests] = useState(initialRequests)

  useEffect(() => {
    const es = new EventSource("/api/requests/stream/me")
    es.onmessage = (e) => {
      try { setRequests(JSON.parse(e.data)) } catch {}
    }
    return () => es.close()
  }, [])

  if (requests.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active</h2>
      <div className="space-y-3">
        {requests.map((r) => (
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
  )
}
