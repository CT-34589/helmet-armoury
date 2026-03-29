"use client"
import { useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Check, X, ShieldCheck, UserPlus, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Clearance {
  id: string
  name: string
  label: string
  description: string | null
  memberIds: string[]
  createdAt: string
}

interface ArtTeamMember {
  id: string
  name: string | null
  image: string | null
  artTeamTier: string | null
}

const TIER_LABELS: Record<string, string> = {
  head: "Head",
  senior: "Senior",
  primary: "Primary",
  reserve: "Reserve",
}

interface EditFormProps {
  initial: { label: string; description: string }
  onSave: (data: { label: string; description: string }) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function EditForm({ initial, onSave, onCancel, saving }: EditFormProps) {
  const [label, setLabel] = useState(initial.label)
  const [description, setDescription] = useState(initial.description)

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Label</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Special Forces" className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Access to Special Forces helmet requests and designs"
          rows={2}
          className="text-sm resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}><X className="h-3.5 w-3.5" />Cancel</Button>
        <Button size="sm" onClick={() => label.trim() && onSave({ label: label.trim(), description: description.trim() })} disabled={saving || !label.trim()}>
          <Check className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}

export function ClearancesManager({
  clearances: initial,
  artTeamMembers,
  isAdmin,
}: {
  clearances: Clearance[]
  artTeamMembers: ArtTeamMember[]
  isAdmin: boolean
}) {
  const [clearances, setClearances] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [togglingMember, setTogglingMember] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim() || !newLabel.trim()) return
    if (!/^[a-z0-9_]+$/.test(newName)) {
      toast.error("Name must be lowercase letters, numbers and underscores only")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/art-team/clearances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), label: newLabel.trim(), description: newDesc.trim() || null }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error?.formErrors?.[0] ?? "Failed to create clearance")
        return
      }
      const created = await res.json()
      setClearances((prev) => [...prev, created])
      setAddOpen(false)
      setNewName(""); setNewLabel(""); setNewDesc("")
      toast.success("Clearance created")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (id: string, data: { label: string; description: string }) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/art-team/clearances/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { toast.error("Failed to update"); return }
      const updated = await res.json()
      setClearances((prev) => prev.map((c) => c.id === id ? { ...c, label: updated.label, description: updated.description } : c))
      setEditingId(null)
      toast.success("Clearance updated")
    } finally {
      setSaving(false)
    }
  }

  const toggleMember = async (clearanceId: string, memberId: string, currentIds: string[]) => {
    const isAdding = !currentIds.includes(memberId)
    const newIds = isAdding ? [...currentIds, memberId] : currentIds.filter((id) => id !== memberId)
    setTogglingMember(memberId)
    try {
      const res = await fetch(`/api/art-team/clearances/${clearanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: newIds }),
      })
      if (!res.ok) { toast.error("Failed to update members"); return }
      setClearances((prev) => prev.map((c) => c.id === clearanceId ? { ...c, memberIds: newIds } : c))
      toast.success(isAdding ? "Member added" : "Member removed")
    } finally {
      setTogglingMember(null)
    }
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete the "${label}" clearance? Members will lose it immediately.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/art-team/clearances/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to delete"); return }
      setClearances((prev) => prev.filter((c) => c.id !== id))
      toast.success("Clearance deleted")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(!addOpen)}>
            <Plus className="h-3.5 w-3.5" />New Clearance
          </Button>
        </div>
      )}

      {addOpen && isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Clearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Name <span className="text-muted-foreground">(slug, cannot be changed)</span></Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="sf"
                className="h-8 text-sm font-mono"
              />
            </div>
            <EditForm
              initial={{ label: newLabel, description: newDesc }}
              onSave={async (data) => {
                if (!newName.trim()) { toast.error("Internal name is required"); return }
                setNewLabel(data.label); setNewDesc(data.description)
                await handleAdd()
              }}
              onCancel={() => { setAddOpen(false); setNewName(""); setNewLabel(""); setNewDesc("") }}
              saving={saving}
            />
          </CardContent>
        </Card>
      )}

      {clearances.length === 0 && !addOpen && (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No clearances defined yet.</p>
          {isAdmin && <p className="text-xs text-muted-foreground mt-1">Click "New Clearance" to create one.</p>}
        </div>
      )}

      {clearances.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {editingId === c.id && isAdmin ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{c.label}</span>
                      <Badge variant="secondary" className="font-mono text-[10px]">{c.name}</Badge>
                    </div>
                    <Separator />
                    <EditForm
                      initial={{ label: c.label, description: c.description ?? "" }}
                      onSave={(data) => handleEdit(c.id, data)}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.label}</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">{c.name}</Badge>
                    {c.description && (
                      <span className="text-xs text-muted-foreground w-full mt-0.5">{c.description}</span>
                    )}
                  </div>
                )}
              </div>
              {isAdmin && editingId !== c.id && (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(c.id)} disabled={!!deleting}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(c.id, c.label)}
                    disabled={deleting === c.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Members */}
            {editingId !== c.id && (
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Members</p>
                <div className="divide-y divide-border rounded-md border">
                  {artTeamMembers.map((member) => {
                    const hasClearance = c.memberIds.includes(member.id)
                    const isToggling = togglingMember === member.id
                    return (
                      <div key={member.id} className="flex items-center gap-3 px-3 py-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={member.image ?? undefined} />
                          <AvatarFallback className="text-[10px]">{member.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.name ?? "Unknown"}</p>
                          {member.artTeamTier && (
                            <p className="text-[11px] text-muted-foreground">{TIER_LABELS[member.artTeamTier] ?? member.artTeamTier}</p>
                          )}
                        </div>
                        {hasClearance && (
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 shrink-0">
                            Cleared
                          </Badge>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 shrink-0"
                            disabled={isToggling}
                            onClick={() => toggleMember(c.id, member.id, c.memberIds)}
                          >
                            {hasClearance
                              ? <><UserMinus className="h-3 w-3" />Remove</>
                              : <><UserPlus className="h-3 w-3" />Add</>}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                  {artTeamMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-4 text-center">No art team members found.</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
