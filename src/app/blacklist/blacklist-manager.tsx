"use client"
import { useState } from "react"
import Image from "next/image"
import { ShieldBan, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

interface BUser { id: string; name: string | null; image: string | null; discordId: string | null; blacklistReason: string | null; requestCount: number; createdAt: string }
interface AUser { id: string; name: string | null; discordId: string | null }

export function BlacklistManager({ blacklisted: initial, allUsers }: { blacklisted: BUser[]; allUsers: AUser[] }) {
  const [blacklisted, setBlacklisted] = useState(initial)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const add = async () => {
    if (!selectedUserId) return
    setLoading(true)
    try {
      const res = await fetch("/api/blacklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedUserId, reason }) })
      if (res.ok) {
        const updated = await res.json()
        setBlacklisted((prev) => [{ ...updated, requestCount: 0 }, ...prev])
        setSelectedUserId(""); setReason("")
      }
    } finally { setLoading(false) }
  }

  const remove = async (id: string) => {
    if (!confirm("Remove from blacklist?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/blacklist/${id}`, { method: "DELETE" })
      if (res.ok) setBlacklisted((prev) => prev.filter((u) => u.id !== id))
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Add to Blacklist</p>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1 min-w-[200px]"><SelectValue placeholder="Select user…" /></SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name ?? "Unknown"}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason…" className="flex-1 min-w-[200px]" />
            <Button variant="destructive" disabled={!selectedUserId || loading} onClick={add}>
              <ShieldBan className="h-4 w-4" />Blacklist
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">Blacklisted — {blacklisted.length}</p>
        {blacklisted.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">No blacklisted users.</p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklisted.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarImage src={u.image ?? ""} /><AvatarFallback className="text-[10px]">{u.name?.[0]}</AvatarFallback></Avatar>
                        <span className="text-sm font-medium">{u.name ?? "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.blacklistReason ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.requestCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(u.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
