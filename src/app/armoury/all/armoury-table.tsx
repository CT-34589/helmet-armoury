"use client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition, useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { StatusBadge } from "@/components/status-tracker"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate, REQUEST_STATUSES } from "@/lib/utils"
import type { RequestStatus } from "@/lib/utils"
import { Download, Search, X, ChevronLeft, ChevronRight, ExternalLink, Trash2 } from "lucide-react"

interface Row {
  id: string; helmetType: string; status: RequestStatus
  completedImageUrl?: string | null; createdAt: string
  userName: string | null; userImage: string | null; artistName: string | null
  decals: string[]; designs: string[]; visorColour?: string | null; attachments: string[]
  battleDamage: boolean; custom: boolean
  customDetails?: string | null; evidenceUrl?: string | null; evidenceNote?: string | null
  declineReason?: string | null
}

interface Props {
  requests: Row[]; total: number; page: number; pageSize: number
  currentQ?: string; currentStatus?: string; isHead: boolean
}

export function ArmouryTable({ requests, total, page, pageSize, currentQ, currentStatus, isHead }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState<Row | null>(null)
  const [rows, setRows] = useState(requests)
  useEffect(() => { setRows(requests) }, [requests])
  const [deleting, setDeleting] = useState(false)
  const [searchValue, setSearchValue] = useState(currentQ ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently remove this helmet from the archive? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" })
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id))
        setSelected(null)
      }
    } finally {
      setDeleting(false)
    }
  }
  const totalPages = Math.ceil(total / pageSize)

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    if (value) params.set(key, value); else params.delete(key)
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => update("q", value || null), 400)
  }

  const handleClear = () => {
    setSearchValue("")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("q")
    params.delete("status")
    params.delete("page")
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const pageTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={searchValue} onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search user or type…" className="pl-8 h-8 text-sm" />
          </div>
          <Select value={currentStatus ?? "ALL"} onValueChange={(v) => update("status", v === "ALL" ? null : v)}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {REQUEST_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          {(searchValue || currentStatus) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleClear}>
              <X className="h-3.5 w-3.5" />Clear
            </Button>
          )}
          <p className="ml-auto text-xs text-muted-foreground">{total.toLocaleString()} results</p>
        </div>

        {/* Table — no image column */}
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Helmet Type</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No results found.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
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
                  <TableCell className="text-sm text-muted-foreground">{r.artistName ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => pageTo(page - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => pageTo(page + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Side panel with full details + image */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                <div className="flex items-start justify-between gap-3 pr-6">
                  <div>
                    <SheetTitle>{selected.helmetType}</SheetTitle>
                    <SheetDescription>#{selected.id.slice(-8)} · {formatDate(selected.createdAt)}</SheetDescription>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {/* Image */}
                {selected.completedImageUrl && (
                  <div className="space-y-2">
                    <div className="rounded-md border bg-muted overflow-hidden">
                      <Image src={selected.completedImageUrl} alt={selected.helmetType}
                        width={400} height={400} className="object-contain max-h-56 w-full" unoptimized />
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" className="flex-1">
                        <a href={selected.completedImageUrl} download><Download className="h-3.5 w-3.5" />Download</a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={selected.completedImageUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
                  <Row label="Trooper" value={selected.userName ?? "Unknown"} />
                  <Row label="Artist" value={selected.artistName ?? "Unassigned"} />
                  {selected.visorColour && <Row label="Visor" value={selected.visorColour} />}
                  <Row label="Battle Damage" value={selected.battleDamage ? "Yes" : "No"} />
                  {selected.custom && <Row label="Custom" value="Yes" />}
                  {selected.customDetails && <Row label="Custom Details" value={selected.customDetails} />}
                  {selected.declineReason && <Row label="Decline Reason" value={selected.declineReason} className="text-destructive" />}
                </div>

                {selected.decals.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decals ({selected.decals.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.decals.map((d) => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                      </div>
                    </div>
                  </>
                )}

                {selected.designs.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Designs ({selected.designs.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.designs.map((d) => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                      </div>
                    </div>
                  </>
                )}

                {selected.attachments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attachments ({selected.attachments.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.attachments.map((a) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}
                      </div>
                    </div>
                  </>
                )}

                {(selected.evidenceUrl || selected.evidenceNote) && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence</p>
                      {selected.evidenceNote && <p className="text-xs text-muted-foreground italic">{selected.evidenceNote}</p>}
                      {selected.evidenceUrl && (
                        <a href={selected.evidenceUrl} target="_blank" rel="noreferrer"
                          className="text-sm text-blue-400 hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="h-3.5 w-3.5" />View in Discord
                        </a>
                      )}
                    </div>
                  </>
                )}

                {isHead && (
                  <>
                    <Separator />
                    <div className="pb-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full border border-red-500/50 text-red-500 hover:bg-red-500/10"
                        disabled={deleting}
                        onClick={() => handleDelete(selected.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deleting ? "Removing…" : "Remove from Archive"}
                      </Button>
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

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex gap-4">
      <p className="text-muted-foreground w-24 shrink-0">{label}</p>
      <p className={cn("text-foreground", className)}>{value}</p>
    </div>
  )
}

function cn(...args: (string | undefined | false | null)[]) {
  return args.filter(Boolean).join(" ")
}
