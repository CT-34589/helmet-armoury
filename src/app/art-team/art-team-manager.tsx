"use client"
import { useState } from "react"
import { UserPlus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

interface Member {
  id: string; name: string | null; image: string | null
  discordId: string | null; artTeamTier: string | null
  activeRequests: number; createdAt: string
}
interface User { id: string; name: string | null; image: string | null; discordId: string | null }

const TIERS = [
  { value: "head", label: "Head of Art Team", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" },
  { value: "senior", label: "Senior Art Team", color: "text-purple-400 border-purple-400/30 bg-purple-400/10" },
  { value: "primary", label: "Primary Art Team", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  { value: "reserve", label: "Reserve Art Team", color: "text-muted-foreground border-border bg-muted/30" },
]

export function tierConfig(tier: string | null) {
  return TIERS.find((t) => t.value === tier) ?? { label: tier ?? "Unknown", color: "text-muted-foreground border-border bg-muted/30" }
}

export function ArtTeamManager({ members: initial, allUsers }: { members: Member[]; allUsers: User[] }) {
  const [members, setMembers] = useState(initial)
  const [selectedId, setSelectedId] = useState("")
  const [selectedTier, setSelectedTier] = useState("reserve")
  const [loading, setLoading] = useState(false)

  const mutate = async (id: string, body: Record<string, unknown>) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/art-team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed")
      return true
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }

  const add = async () => {
    if (!selectedId) return
    const ok = await mutate(selectedId, { isArtTeam: true, artTeamTier: selectedTier })
    if (ok) {
      const user = allUsers.find((u) => u.id === selectedId)!
      setMembers((prev) => [...prev, { ...user, artTeamTier: selectedTier, activeRequests: 0, createdAt: new Date().toISOString() }])
      setSelectedId("")
      toast.success("Member added. They will need to sign in again for changes to take effect.")
    } else {
      toast.error("Failed to add member")
    }
  }

  const updateTier = async (id: string, tier: string) => {
    const ok = await mutate(id, { artTeamTier: tier })
    if (ok) {
      setMembers((prev) => prev.map((m) => m.id === id ? { ...m, artTeamTier: tier } : m))
      toast.success("Tier updated. Member will need to sign in again.")
    } else {
      toast.error("Failed to update tier")
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Remove this member from the Art Team? They will be signed out immediately.")) return
    const ok = await mutate(id, { isArtTeam: false, artTeamTier: null })
    if (ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id))
      toast.success("Member removed and signed out.")
    } else {
      toast.error("Failed to remove member")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Add Member</p>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="flex-1 min-w-[180px]">
                <SelectValue placeholder="Select a user…" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={u.image ?? ""} />
                        <AvatarFallback className="text-[10px]">{u.name?.[0]}</AvatarFallback>
                      </Avatar>
                      {u.name ?? "Unknown"}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button disabled={!selectedId || loading} onClick={add}>
              <UserPlus className="h-4 w-4" />Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">No art team members.</TableCell></TableRow>
            ) : members.map((m) => {
              const tier = tierConfig(m.artTeamTier)
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={m.image ?? ""} />
                        <AvatarFallback className="text-xs">{m.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{m.name ?? "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={m.artTeamTier ?? "reserve"} onValueChange={(v) => updateTier(m.id, v)}>
                      <SelectTrigger className="h-7 w-40 text-xs border-0 px-0 focus:ring-0">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${tier.color}`}>
                          {tier.label}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {m.activeRequests > 0
                      ? <Badge variant="secondary">{m.activeRequests}</Badge>
                      : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(m.id)} disabled={loading}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
