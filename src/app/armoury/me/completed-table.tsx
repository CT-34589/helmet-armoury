"use client"
import { useState } from "react"
import Image from "next/image"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/status-tracker"
import { formatDate } from "@/lib/utils"
import { Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"

const PAGE_SIZE = 20

interface CompletedRequest {
  id: string
  helmetType: string        // already resolved to display label
  artistName: string | null
  completedImageUrl: string | null
  createdAt: string
  decals: string[]          // already resolved to display labels
  designs: string[]         // already resolved to display labels
  visorColour: string | null
  attachments: string[]     // already resolved to display labels
  battleDamage: boolean
  custom: boolean
  customDetails: string | null
}

export function CompletedTable({ requests }: { requests: CompletedRequest[] }) {
  const [selected, setSelected] = useState<CompletedRequest | null>(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(requests.length / PAGE_SIZE)
  const clampedPage = Math.min(page, Math.max(1, totalPages))
  const pageRows = requests.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Helmet Type</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => setSelected(r)}
              >
                <TableCell className="font-medium text-sm">{r.helmetType}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.artistName ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">Page {clampedPage} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={clampedPage <= 1} onClick={() => setPage(clampedPage - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={clampedPage >= totalPages} onClick={() => setPage(clampedPage + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                <div className="flex items-start justify-between gap-3 pr-6">
                  <div>
                    <SheetTitle>{selected.helmetType}</SheetTitle>
                    <SheetDescription>
                      #{selected.id.slice(-8)} · {formatDate(selected.createdAt)}
                    </SheetDescription>
                  </div>
                  <StatusBadge status="COMPLETED" />
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {/* Image + download */}
                {selected.completedImageUrl ? (
                  <div className="space-y-2">
                    <div className="rounded-md border bg-muted overflow-hidden">
                      <Image
                        src={selected.completedImageUrl}
                        alt={selected.helmetType}
                        width={400}
                        height={400}
                        className="object-contain max-h-64 w-full"
                        unoptimized
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button asChild className="flex-1" size="sm">
                        <a href={selected.completedImageUrl} download>
                          <Download className="h-3.5 w-3.5" />Download
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={selected.completedImageUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No image available
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
                  <div className="flex gap-4">
                    <p className="text-muted-foreground w-24 shrink-0">Artist</p>
                    <p>{selected.artistName ?? "—"}</p>
                  </div>
                  {selected.visorColour && (
                    <div className="flex gap-4">
                      <p className="text-muted-foreground w-24 shrink-0">Visor</p>
                      <p>{selected.visorColour}</p>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <p className="text-muted-foreground w-24 shrink-0">Battle Damage</p>
                    <p>{selected.battleDamage ? "Yes" : "No"}</p>
                  </div>
                  {selected.custom && (
                    <div className="flex gap-4">
                      <p className="text-muted-foreground w-24 shrink-0">Custom</p>
                      <p>Yes</p>
                    </div>
                  )}
                  {selected.customDetails && (
                    <div className="flex gap-4">
                      <p className="text-muted-foreground w-24 shrink-0">Details</p>
                      <p className="text-muted-foreground italic">{selected.customDetails}</p>
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
                        {selected.attachments.map((a) => (
                          <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
