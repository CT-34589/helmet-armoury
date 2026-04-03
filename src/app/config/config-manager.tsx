"use client"
import { useState, useCallback } from "react"
import { Plus, Trash2, Search, X, Settings2, Pencil, Check, Shield, Loader2, ShieldCheck, GripVertical, Timer } from "lucide-react"
import { toast } from "sonner"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ConfigItem {
  id: string; category: string; subCategory: string | null; helmetCategory: string | null
  name: string; label: string; requirement: string | null; rankReq: string | null
  note: string | null; active: boolean; standard: boolean; slotWeight: number; sortOrder: number; allowedRoleIds: string[]
}

interface HelmetCategoryRecord {
  id: string; name: string; sortOrder: number; clearance: string | null
}

interface ClearanceOption { name: string; label: string }

interface DiscordRole {
  id: string; name: string; color: number
}

const TAB_GROUPS = [
  { key: "settings",         label: "Settings",          category: "" },
  { key: "helmetCategories", label: "Helmet Categories",  category: "__helmetCategories__" },
  { key: "helmetType",       label: "Helmet Types",       category: "helmetType" },
  { key: "visorColour",      label: "Visor Colours",      category: "visorColour" },
  { key: "attachment",       label: "Attachments",        category: "attachment" },
  { key: "decal",            label: "Decals",             category: "decal" },
  { key: "design",           label: "Designs",            category: "design" },
]

// ─── Role Picker ─────────────────────────────────────────────────────────────

function RolePickerCell({
  itemId, roleIds, onSave,
}: {
  itemId: string
  roleIds: string[]
  onSave: (id: string, roleIds: string[]) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(roleIds)
  const [saving, setSaving] = useState(false)
  const [guild, setGuild] = useState<"main" | "kmc">("main")
  const [mainRoles, setMainRoles] = useState<DiscordRole[]>([])
  const [kmcRoles, setKmcRoles] = useState<DiscordRole[]>([])
  const [loadedGuilds, setLoadedGuilds] = useState<Set<string>>(new Set())
  const [rolesLoading, setRolesLoading] = useState(false)

  const fetchRoles = async (g: "main" | "kmc") => {
    if (loadedGuilds.has(g)) return
    setRolesLoading(true)
    try {
      const res = await fetch(`/api/discord-roles?guild=${g}`)
      if (res.ok) {
        const roles: DiscordRole[] = await res.json()
        if (g === "main") setMainRoles(roles)
        else setKmcRoles(roles)
        setLoadedGuilds((prev) => new Set([...prev, g]))
      }
    } finally {
      setRolesLoading(false)
    }
  }

  const handleOpenChange = async (o: boolean) => {
    if (o) {
      setSelected(roleIds)
      await fetchRoles(guild)
    } else {
      const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...roleIds].sort())
      if (changed) {
        setSaving(true)
        try { await onSave(itemId, selected) } finally { setSaving(false) }
      }
    }
    setOpen(o)
  }

  const handleGuildChange = async (g: "main" | "kmc") => {
    setGuild(g)
    await fetchRoles(g)
  }

  const activeRoles = guild === "main" ? mainRoles : kmcRoles

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 font-normal" disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
          {roleIds.length === 0
            ? <span className="text-muted-foreground">All</span>
            : <span>{roleIds.length} role{roleIds.length !== 1 ? "s" : ""}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="px-3 pt-3 pb-2 border-b">
          <p className="text-xs font-semibold">Role Restriction</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Leave empty to allow all members.
          </p>
          <div className="flex gap-1 mt-2">
            {(["main", "kmc"] as const).map((g) => (
              <button
                key={g}
                onClick={() => handleGuildChange(g)}
                className={cn(
                  "text-xs px-2 py-0.5 rounded transition-colors",
                  guild === g
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g === "main" ? "Main Server" : "KMC"}
              </button>
            ))}
          </div>
        </div>
        <Command>
          <CommandInput placeholder="Search roles…" />
          <CommandList className="max-h-52">
            {rolesLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />Loading roles…
              </div>
            ) : activeRoles.length === 0 ? (
              <CommandEmpty>No roles found. Set DISCORD_BOT_TOKEN to sync roles.</CommandEmpty>
            ) : (
              <CommandGroup>
                {activeRoles.map((role) => (
                  <CommandItem
                    key={role.id}
                    value={role.name}
                    onSelect={() => setSelected((prev) =>
                      prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
                    )}
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", selected.includes(role.id) ? "opacity-100" : "opacity-0")} />
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "hsl(var(--muted))" }}
                      />
                      <span className="text-sm">{role.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        {selected.length > 0 && (
          <div className="px-3 py-2 border-t">
            <button
              onClick={() => setSelected([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear restriction
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── Setting Role Picker ──────────────────────────────────────────────────────

function SettingRolePicker({
  label, roleIds, onSave,
}: {
  label: string
  roleIds: string[]
  onSave: (ids: string[]) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(roleIds)
  const [saving, setSaving] = useState(false)
  const [guild, setGuild] = useState<"main" | "kmc">("kmc")
  const [mainRoles, setMainRoles] = useState<DiscordRole[]>([])
  const [kmcRoles, setKmcRoles] = useState<DiscordRole[]>([])
  const [loadedGuilds, setLoadedGuilds] = useState<Set<string>>(new Set())
  const [rolesLoading, setRolesLoading] = useState(false)

  const fetchRoles = async (g: "main" | "kmc") => {
    if (loadedGuilds.has(g)) return
    setRolesLoading(true)
    try {
      const res = await fetch(`/api/discord-roles?guild=${g}`)
      if (res.ok) {
        const roles: DiscordRole[] = await res.json()
        if (g === "main") setMainRoles(roles)
        else setKmcRoles(roles)
        setLoadedGuilds((prev) => new Set([...prev, g]))
      }
    } finally { setRolesLoading(false) }
  }

  const handleOpenChange = async (o: boolean) => {
    if (o) {
      setSelected(roleIds)
      await fetchRoles(guild)
    } else {
      const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...roleIds].sort())
      if (changed) {
        setSaving(true)
        try { await onSave(selected) } finally { setSaving(false) }
      }
    }
    setOpen(o)
  }

  const activeRoles = guild === "main" ? mainRoles : kmcRoles

  return (
    <div className="flex items-center justify-between py-1.5">
      <p className="text-xs font-medium">{label}</p>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 font-normal shrink-0 ml-3" disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
            {roleIds.length === 0 ? <span className="text-muted-foreground">Set roles</span> : <span>{roleIds.length} role{roleIds.length !== 1 ? "s" : ""}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <div className="px-3 pt-3 pb-2 border-b">
            <p className="text-xs font-semibold">{label} — Role IDs</p>
            <p className="text-xs text-muted-foreground mt-0.5">Members with any of these roles get this rank tier.</p>
            <div className="flex gap-1 mt-2">
              {(["main", "kmc"] as const).map((g) => (
                <button
                  key={g}
                  onClick={async () => { setGuild(g); await fetchRoles(g) }}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded transition-colors",
                    guild === g ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {g === "main" ? "Main Server" : "KMC"}
                </button>
              ))}
            </div>
          </div>
          <Command>
            <CommandInput placeholder="Search roles…" />
            <CommandList className="max-h-52">
              {rolesLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />Loading roles…
                </div>
              ) : activeRoles.length === 0 ? (
                <CommandEmpty>No roles found. Set DISCORD_BOT_TOKEN to sync roles.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {activeRoles.map((role) => (
                    <CommandItem
                      key={role.id}
                      value={role.name}
                      onSelect={() => setSelected((prev) =>
                        prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
                      )}
                    >
                      <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", selected.includes(role.id) ? "opacity-100" : "opacity-0")} />
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "hsl(var(--muted))" }}
                        />
                        <span className="text-sm">{role.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t">
              <button onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Clear roles (use env var)
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ─── Sortable Row ─────────────────────────────────────────────────────────────

function SortableRow({ id, disabled, className, children }: { id: string; disabled?: boolean; className?: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(disabled ? undefined : "group/sortable", className)}
    >
      <TableCell className="w-8 px-1 py-0">
        {!disabled && (
          <button
            {...attributes}
            {...listeners}
            tabIndex={-1}
            className="flex items-center justify-center h-full w-7 py-3 cursor-grab active:cursor-grabbing text-muted-foreground/30 opacity-0 group-hover/sortable:opacity-100 transition-opacity hover:text-muted-foreground"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
      </TableCell>
      {children}
    </TableRow>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConfigManager({ items: initial, settings: initialSettings, helmetCategories: initialCats, clearanceOptions = [] }: {
  items: ConfigItem[]
  settings: Record<string, string>
  helmetCategories: HelmetCategoryRecord[]
  clearanceOptions?: ClearanceOption[]
}) {
  const [items, setItems] = useState(initial)
  const [settings, setSettings] = useState(initialSettings)
  const [helmetCategories, setHelmetCategories] = useState(initialCats)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const reorderItems = useCallback(async (tabItems: ConfigItem[], event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tabItems.findIndex((i) => i.id === active.id)
    const newIndex = tabItems.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(tabItems, oldIndex, newIndex)
    const tabIdSet = new Set(tabItems.map((i) => i.id))
    setItems((prev) => [
      ...reordered.map((item, idx) => ({ ...item, sortOrder: idx })),
      ...prev.filter((i) => !tabIdSet.has(i.id)),
    ])
    const res = await fetch("/api/config/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((i) => i.id) }),
    })
    if (!res.ok) toast.error("Failed to save order")
  }, [])

  const reorderCategories = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = helmetCategories.findIndex((c) => c.id === active.id)
    const newIndex = helmetCategories.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(helmetCategories, oldIndex, newIndex)
    setHelmetCategories(reordered.map((c, idx) => ({ ...c, sortOrder: idx })))
    const res = await fetch("/api/helmet-categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
    })
    if (!res.ok) toast.error("Failed to save order")
  }, [helmetCategories])
  const [decalSubCat, setDecalSubCat] = useState("all")
  const [designSubCat, setDesignSubCat] = useState("all")
  const [loading, setLoading] = useState<string | null>(null)
  const [addDialog, setAddDialog] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<ConfigItem & { helmetCategory: string }>>({})
  const [search, setSearch] = useState("")
  const [newItem, setNewItem] = useState({ name: "", label: "", requirement: "", rankReq: "", note: "", subCategory: "", helmetCategory: "" })

  // Helmet category CRUD state
  const [newCatName, setNewCatName] = useState("")
  const [addingCat, setAddingCat] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState("")

  const decalSubCats = [...new Set(
    items.filter((i) => i.category === "decal" && i.subCategory).map((i) => i.subCategory!)
  )]
  const designSubCats = [...new Set(
    items.filter((i) => i.category === "design" && i.subCategory).map((i) => i.subCategory!)
  )]

  const requestsOpen = settings["requests_open"] !== "false"
  const closeMessage = settings["requests_close_message"] ?? ""

  const decaledEnabled = settings["cooldown_decaled_enabled"] !== "false"
  const customEnabled = settings["cooldown_custom_enabled"] !== "false"

  const updateSetting = async (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    const res = await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    })
    if (res.ok) toast.success("Setting saved")
    else toast.error("Failed to save setting")
  }

  const mutate = async (id: string, body: Record<string, unknown>) => {
    setLoading(id)
    try {
      const res = await fetch(`/api/config/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setItems((prev) => prev.map((i) => i.id === id ? {
          ...i,
          ...updated,
          allowedRoleIds: Array.isArray(updated.allowedRoleIds)
            ? updated.allowedRoleIds
            : JSON.parse(updated.allowedRoleIds ?? "[]"),
        } : i))
        return true
      }
      return false
    } finally { setLoading(null) }
  }

  const saveRoles = async (id: string, roleIds: string[]) => {
    await mutate(id, { allowedRoleIds: roleIds })
  }

  const saveEdit = async (id: string) => {
    const ok = await mutate(id, editValues)
    if (ok) { setEditingId(null); setEditValues({}); toast.success("Item updated") }
    else toast.error("Failed to update item")
  }

  const startEdit = (item: ConfigItem) => {
    setEditingId(item.id)
    setEditValues({
      label: item.label,
      requirement: item.requirement ?? "",
      helmetCategory: item.helmetCategory ?? "",
      subCategory: item.subCategory ?? "",
      note: item.note ?? "",
    })
  }

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return
    setLoading(id)
    const res = await fetch(`/api/config/${id}`, { method: "DELETE" })
    if (res.ok) { setItems((prev) => prev.filter((i) => i.id !== id)); toast.success("Item deleted") }
    else toast.error("Failed to delete item")
    setLoading(null)
  }

  const addItem = async (tab: typeof TAB_GROUPS[0]) => {
    if (!newItem.name || !newItem.label) return
    setLoading("new")
    const subCat = tab.key === "decal"
      ? (decalSubCat !== "all" ? decalSubCat : newItem.subCategory || null)
      : tab.key === "design"
      ? (designSubCat !== "all" ? designSubCat : newItem.subCategory || null)
      : null
    const res = await fetch("/api/config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: tab.category, subCategory: subCat,
        helmetCategory: newItem.helmetCategory || null,
        name: newItem.name, label: newItem.label,
        requirement: newItem.requirement || null,
        rankReq: newItem.rankReq || null,
        note: newItem.note || null,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setItems((prev) => [...prev, { ...created, allowedRoleIds: [] }])
      setNewItem({ name: "", label: "", requirement: "", rankReq: "", note: "", subCategory: "", helmetCategory: "" })
      setAddDialog(null)
      toast.success("Item added")
    } else { toast.error("Failed to add item") }
    setLoading(null)
  }

  const getTabItems = (tab: typeof TAB_GROUPS[0]) => {
    if (!tab.category || tab.category === "__helmetCategories__") return []
    return items.filter((i) => {
      if (i.category !== tab.category) return false
      if (tab.key === "decal" && decalSubCat !== "all" && i.subCategory !== decalSubCat) return false
      if (tab.key === "design" && designSubCat !== "all" && i.subCategory !== designSubCat) return false
      return !search ||
        i.label.toLowerCase().includes(search.toLowerCase()) ||
        (i.requirement ?? "").toLowerCase().includes(search.toLowerCase())
    })
  }

  // ── Helmet category handlers ──────────────────────────────────────────────

  const addHelmetCategory = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      const res = await fetch("/api/helmet-categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      })
      if (res.ok) {
        const cat = await res.json()
        setHelmetCategories((prev) => [...prev, cat])
        setNewCatName("")
        toast.success("Category added")
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to add category")
      }
    } finally { setAddingCat(false) }
  }

  const saveCatClearance = async (id: string, clearance: string | null) => {
    const res = await fetch(`/api/helmet-categories/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearance }),
    })
    if (res.ok) {
      const cat = await res.json()
      setHelmetCategories((prev) => prev.map((c) => c.id === id ? { ...c, clearance: cat.clearance ?? null } : c))
      toast.success("Clearance updated")
    } else {
      toast.error("Failed to update clearance")
    }
  }

  const saveHelmetCategory = async (id: string) => {
    if (!editCatName.trim()) return
    const res = await fetch(`/api/helmet-categories/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCatName.trim() }),
    })
    if (res.ok) {
      const cat = await res.json()
      // Also update any ConfigItems referencing the old name
      const old = helmetCategories.find((c) => c.id === id)
      if (old && old.name !== cat.name) {
        setItems((prev) => prev.map((i) =>
          i.helmetCategory === old.name ? { ...i, helmetCategory: cat.name } : i
        ))
      }
      setHelmetCategories((prev) => prev.map((c) => c.id === id ? cat : c))
      setEditingCatId(null)
      toast.success("Category renamed")
    } else {
      const data = await res.json()
      toast.error(data.error ?? "Failed to rename")
    }
  }

  const deleteHelmetCategory = async (id: string) => {
    if (!confirm("Delete this category? Helmet types in this category will become uncategorised.")) return
    const res = await fetch(`/api/helmet-categories/${id}`, { method: "DELETE" })
    if (res.ok) {
      const old = helmetCategories.find((c) => c.id === id)
      setHelmetCategories((prev) => prev.filter((c) => c.id !== id))
      if (old) {
        setItems((prev) => prev.map((i) =>
          i.helmetCategory === old.name ? { ...i, helmetCategory: null } : i
        ))
      }
      toast.success("Category deleted")
    } else toast.error("Failed to delete category")
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search config items…" className="pl-8 h-9" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Tabs defaultValue="settings">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex-nowrap inline-flex w-auto">
            {TAB_GROUPS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="shrink-0 text-xs">
                {tab.label}
                {tab.key !== "settings" && tab.key !== "helmetCategories" && (
                  <span className="ml-1.5 inline-flex items-center rounded-md border border-border bg-muted px-1 py-0 text-[10px] text-muted-foreground">
                    {getTabItems(tab).length}
                  </span>
                )}
                {tab.key === "helmetCategories" && (
                  <span className="ml-1.5 inline-flex items-center rounded-md border border-border bg-muted px-1 py-0 text-[10px] text-muted-foreground">
                    {helmetCategories.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Settings tab */}
        <TabsContent value="settings">
          <div className="space-y-4 max-w-lg">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" />Request System</CardTitle>
                <CardDescription>Control whether troopers can submit new requests.</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Accept New Requests</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {requestsOpen ? "Request form is open." : "Request form is closed."}
                    </p>
                  </div>
                  <Switch checked={requestsOpen} onCheckedChange={(v) => updateSetting("requests_open", String(v))} />
                </div>
                <div className={cn("rounded-md px-3 py-2 text-xs font-medium", requestsOpen ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20")}>
                  {requestsOpen ? "● Requests open" : "● Requests closed"}
                </div>
                {!requestsOpen && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Custom Closed Message</Label>
                    <Textarea
                      value={closeMessage}
                      onChange={(e) => setSettings((prev) => ({ ...prev, requests_close_message: e.target.value }))}
                      onBlur={() => updateSetting("requests_close_message", closeMessage)}
                      placeholder="Message shown to troopers when requests are closed…"
                      rows={3} className="resize-none text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Saved automatically when you click away.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Timer className="h-4 w-4" />Cooldowns</CardTitle>
                <CardDescription>How long members must wait between requests. Days are counted from the completion date.</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-5">

                {/* Decaled */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Decaled Helmets</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Standard helmets (CT-SGT rank) and non-standard excluding Cadre+</p>
                    </div>
                    <Switch checked={decaledEnabled} onCheckedChange={(v) => updateSetting("cooldown_decaled_enabled", String(v))} />
                  </div>
                  {decaledEnabled && (
                    <div className="grid grid-cols-2 gap-3 pl-0">
                      <div className="space-y-1.5">
                        <Label className="text-xs">First request (days)</Label>
                        <Input
                          type="number" min={0} max={3650}
                          value={settings["cooldown_decaled_first_days"] ?? "90"}
                          onChange={(e) => setSettings((p) => ({ ...p, cooldown_decaled_first_days: e.target.value }))}
                          onBlur={(e) => updateSetting("cooldown_decaled_first_days", e.target.value || "90")}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Subsequent requests (days)</Label>
                        <Input
                          type="number" min={0} max={3650}
                          value={settings["cooldown_decaled_subsequent_days"] ?? "180"}
                          onChange={(e) => setSettings((p) => ({ ...p, cooldown_decaled_subsequent_days: e.target.value }))}
                          onBlur={(e) => updateSetting("cooldown_decaled_subsequent_days", e.target.value || "180")}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Custom */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Custom Helmets</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Standard helmets (SGM+/Cadre), non-standard (Cadre+), and SF-gated helmets</p>
                    </div>
                    <Switch checked={customEnabled} onCheckedChange={(v) => updateSetting("cooldown_custom_enabled", String(v))} />
                  </div>
                  {customEnabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">First request (days)</Label>
                        <Input
                          type="number" min={0} max={3650}
                          value={settings["cooldown_custom_first_days"] ?? "180"}
                          onChange={(e) => setSettings((p) => ({ ...p, cooldown_custom_first_days: e.target.value }))}
                          onBlur={(e) => updateSetting("cooldown_custom_first_days", e.target.value || "180")}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Subsequent requests (days)</Label>
                        <Input
                          type="number" min={0} max={3650}
                          value={settings["cooldown_custom_subsequent_days"] ?? "270"}
                          onChange={(e) => setSettings((p) => ({ ...p, cooldown_custom_subsequent_days: e.target.value }))}
                          onBlur={(e) => updateSetting("cooldown_custom_subsequent_days", e.target.value || "270")}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Rank tiers */}
                <div className="space-y-1">
                  <p className="text-sm font-medium">Rank Tiers</p>
                  <p className="text-xs text-muted-foreground">
                    Which Discord roles map to each rank tier. Determines whether a member gets the Decaled or Custom cooldown.
                    If no roles are set here, the <code className="text-[10px] bg-muted px-1 py-0.5 rounded">KMC_*_ROLE_IDS</code> env vars are used as fallback.
                  </p>
                  <div className="divide-y divide-border rounded-md border mt-2">
                    {([
                      { key: "cooldown_rank_head_cadre_role_ids", label: "Head Cadre" },
                      { key: "cooldown_rank_cadre_role_ids", label: "Cadre" },
                      { key: "cooldown_rank_sgm_plus_role_ids", label: "SGM+" },
                    ] as const).map(({ key, label }) => (
                      <div key={key} className="px-3">
                        <SettingRolePicker
                          label={label}
                          roleIds={(settings[key] ?? "").split(",").map((s) => s.trim()).filter(Boolean)}
                          onSave={(ids) => updateSetting(key, ids.join(","))}
                        />
                      </div>
                    ))}
                    <div className="px-3">
                      <SettingRolePicker
                        label="CT-SGT"
                        roleIds={(settings["cooldown_rank_ct_sgt_role_ids"] ?? "").split(",").map((s) => s.trim()).filter(Boolean)}
                        onSave={(ids) => updateSetting("cooldown_rank_ct_sgt_role_ids", ids.join(","))}
                      />
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Request Eligibility</CardTitle>
                <CardDescription>
                  Which roles can sign in and submit helmet requests. Art team members always bypass this. If no roles are configured, everyone can sign in and request.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-3">
                <div className="divide-y divide-border rounded-md border">
                  <div className="px-3">
                    <SettingRolePicker
                      label="Eligible Roles (e.g. CT+)"
                      roleIds={(settings["request_eligible_role_ids"] ?? "").split(",").map((s) => s.trim()).filter(Boolean)}
                      onSave={(ids) => updateSetting("request_eligible_role_ids", ids.join(","))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Members must hold <span className="font-medium">any</span> of these roles to access the request form. Takes effect immediately.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Timer className="h-4 w-4" />Slot Limits</CardTitle>
                <CardDescription>
                  Configure which roles map to each rank tier and how many design/decal slots that tier gets. SGM+ and above have no slot limit.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-0">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center pb-2 px-1">
                  <p className="text-xs font-medium text-muted-foreground">Rank Tier</p>
                  <p className="text-xs font-medium text-muted-foreground w-20 text-center">Designs</p>
                  <p className="text-xs font-medium text-muted-foreground w-20 text-center">Decals</p>
                </div>
                <div className="divide-y divide-border rounded-md border">
                  {([
                    { label: "SGT/FCPT", roleKey: "slot_rank_sgt_fcpt_role_ids", designKey: "slots_designs_sgt_fcpt", decalKey: "slots_decals_sgt_fcpt", def: "5" },
                    { label: "CPL/FLT",  roleKey: "slot_rank_cpl_flt_role_ids",  designKey: "slots_designs_cpl_flt",  decalKey: "slots_decals_cpl_flt",  def: "4" },
                    { label: "LCPL/FO",  roleKey: "slot_rank_lcpl_fo_role_ids",  designKey: "slots_designs_lcpl_fo",  decalKey: "slots_decals_lcpl_fo",  def: "3" },
                    { label: "CT/PO",    roleKey: "slot_rank_ct_po_role_ids",    designKey: "slots_designs_ct_po",    decalKey: "slots_decals_ct_po",    def: "2" },
                  ]).map(({ label, roleKey, designKey, decalKey, def }) => (
                    <div key={label} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-3">
                      <SettingRolePicker
                        label={label}
                        roleIds={(settings[roleKey] ?? "").split(",").map((s) => s.trim()).filter(Boolean)}
                        onSave={(ids) => updateSetting(roleKey, ids.join(","))}
                      />
                      <Input
                        type="number" min={0} max={999}
                        value={settings[designKey] ?? def}
                        onChange={(e) => setSettings((p) => ({ ...p, [designKey]: e.target.value }))}
                        onBlur={(e) => updateSetting(designKey, e.target.value || def)}
                        className="h-7 w-20 text-xs text-center"
                      />
                      <Input
                        type="number" min={0} max={999}
                        value={settings[decalKey] ?? def}
                        onChange={(e) => setSettings((p) => ({ ...p, [decalKey]: e.target.value }))}
                        onBlur={(e) => updateSetting(decalKey, e.target.value || def)}
                        className="h-7 w-20 text-xs text-center"
                      />
                    </div>
                  ))}
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">SGM+ rank</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Cadre/Head Cadre still use their rank&apos;s tier above</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Unlimited</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Helmet Categories tab */}
        <TabsContent value="helmetCategories">
          <Card>
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium">Helmet Categories</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Categories group helmet types in the request form combobox.
              </p>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderCategories}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Name</TableHead>
                    <TableHead className="w-48">Required Clearance</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <SortableContext items={helmetCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {helmetCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                          No categories yet. Add one below.
                        </TableCell>
                      </TableRow>
                    ) : helmetCategories.map((cat) => (
                      <SortableRow key={cat.id} id={cat.id} disabled={editingCatId === cat.id}>
                        <TableCell>
                          {editingCatId === cat.id ? (
                            <Input
                              value={editCatName}
                              onChange={(e) => setEditCatName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveHelmetCategory(cat.id); if (e.key === "Escape") setEditingCatId(null) }}
                              className="h-7 text-xs max-w-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium">{cat.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={cat.clearance ?? "__none__"}
                            onValueChange={(v) => saveCatClearance(cat.id, v === "__none__" ? null : v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="text-muted-foreground">No restriction</span>
                              </SelectItem>
                              {(clearanceOptions ?? []).map((c) => (
                                <SelectItem key={c.name} value={c.name}>
                                  <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                                    {c.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {editingCatId === cat.id ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" onClick={() => saveHelmetCategory(cat.id)}>
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingCatId(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name) }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteHelmetCategory(cat.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </SortableRow>
                    ))}
                  </TableBody>
                </SortableContext>
              </Table>
            </DndContext>
            <div className="px-4 py-3 border-t flex gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addHelmetCategory() }}
                placeholder="New category name…"
                className="h-8 text-sm max-w-xs"
              />
              <Button size="sm" onClick={addHelmetCategory} disabled={addingCat || !newCatName.trim()}>
                <Plus className="h-3.5 w-3.5" />Add
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Config item tabs */}
        {TAB_GROUPS.filter((t) => t.key !== "settings" && t.key !== "helmetCategories").map((tab) => {
          const tabItems = getTabItems(tab)
          return (
            <TabsContent key={tab.key} value={tab.key}>
              <Card>
                <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
                  <p className="text-sm font-medium shrink-0">{tab.label}</p>
                  {tab.key === "decal" && (
                    <Select value={decalSubCat} onValueChange={setDecalSubCat}>
                      <SelectTrigger className="h-7 text-xs w-48">
                        <SelectValue placeholder="All subcategories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {decalSubCats.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {tab.key === "design" && (
                    <Select value={designSubCat} onValueChange={setDesignSubCat}>
                      <SelectTrigger className="h-7 text-xs w-48">
                        <SelectValue placeholder="All subcategories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {designSubCats.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setAddDialog(tab.key)} className="shrink-0">
                    <Plus className="h-3.5 w-3.5" />Add
                  </Button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => reorderItems(tabItems, e)}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        {tab.key === "helmetType" && <TableHead className="w-36">Category</TableHead>}
                        {((tab.key === "decal" && decalSubCat === "all") || (tab.key === "design" && designSubCat === "all")) && (
                          <TableHead className="w-32">Group</TableHead>
                        )}
                        <TableHead>Label</TableHead>
                        <TableHead className="hidden md:table-cell">Requirement</TableHead>
                        <TableHead className="w-20 text-center">Active</TableHead>
                        {tab.key === "helmetType" && <TableHead className="w-24 text-center">Standard</TableHead>}
                        {tab.key !== "helmetType" && <TableHead className="w-16 text-center">Slots</TableHead>}
                        <TableHead className="w-24 text-right">Roles</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <SortableContext items={tabItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <TableBody>
                        {tabItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={
                              tab.key === "helmetType" ? 9
                              : ((tab.key === "decal" && decalSubCat === "all") || (tab.key === "design" && designSubCat === "all")) ? 10
                              : 9
                            } className="text-center text-muted-foreground text-sm py-8">
                              {search ? "No items match your search." : "No items yet."}
                            </TableCell>
                          </TableRow>
                        ) : tabItems.map((item) => {
                          const isEditing = editingId === item.id
                          return (
                            <SortableRow key={item.id} id={item.id} disabled={!!search || isEditing}
                              className={cn(!item.active && "opacity-40", loading === item.id && "opacity-60")}>
                              {tab.key === "helmetType" && (
                                <TableCell>
                                  {isEditing ? (
                                    <Select
                                      value={editValues.helmetCategory ?? ""}
                                      onValueChange={(v) => setEditValues((prev) => ({ ...prev, helmetCategory: v === "__none__" ? "" : v }))}
                                    >
                                      <SelectTrigger className="h-7 text-xs w-32">
                                        <SelectValue placeholder="Category…" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">— None —</SelectItem>
                                        {helmetCategories.map((cat) => (
                                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">{item.helmetCategory ?? "—"}</span>
                                  )}
                                </TableCell>
                              )}
                              {((tab.key === "decal" && decalSubCat === "all") || (tab.key === "design" && designSubCat === "all")) && (
                                <TableCell className="text-xs text-muted-foreground">{item.subCategory ?? "—"}</TableCell>
                              )}
                              <TableCell>
                                {isEditing
                                  ? <Input value={editValues.label ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, label: e.target.value }))} className="h-7 text-xs" />
                                  : <div><p className="text-sm font-medium">{item.label}</p>{item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}</div>}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {isEditing
                                  ? <Input value={editValues.requirement ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, requirement: e.target.value }))} className="h-7 text-xs" />
                                  : <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{item.requirement ?? "—"}</p>}
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch checked={item.active} onCheckedChange={(v) => mutate(item.id, { active: v })} />
                              </TableCell>
                              {tab.key === "helmetType" && (
                                <TableCell className="text-center">
                                  <Switch checked={item.standard} onCheckedChange={(v) => mutate(item.id, { standard: v })} />
                                </TableCell>
                              )}
                              {tab.key !== "helmetType" && (
                                <TableCell className="text-center">
                                  <input
                                    type="number" min={1} max={10}
                                    key={item.id + "-" + item.slotWeight}
                                    defaultValue={item.slotWeight}
                                    onBlur={(e) => {
                                      const v = Math.max(1, parseInt(e.target.value) || 1)
                                      if (v !== item.slotWeight) mutate(item.id, { slotWeight: v })
                                    }}
                                    className="h-7 w-12 text-xs text-center rounded-md border border-input bg-background px-1"
                                  />
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                <RolePickerCell
                                  itemId={item.id}
                                  roleIds={item.allowedRoleIds}
                                  onSave={saveRoles}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {isEditing ? (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" onClick={() => saveEdit(item.id)}>
                                        <Check className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                                        onClick={() => { setEditingId(null); setEditValues({}) }}>
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => startEdit(item)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => deleteItem(item.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </SortableRow>
                          )
                        })}
                      </TableBody>
                    </SortableContext>
                  </Table>
                </DndContext>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Add dialog */}
      {TAB_GROUPS.filter((t) => t.key !== "settings" && t.key !== "helmetCategories").map((tab) => (
        <Dialog key={tab.key} open={addDialog === tab.key} onOpenChange={(o) => !o && setAddDialog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Add to {tab.label}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Internal Name</Label>
                  <Input value={newItem.name} onChange={(e) => setNewItem((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. phase_2_trooper" />
                </div>
                <div className="space-y-1.5">
                  <Label>Display Label</Label>
                  <Input value={newItem.label} onChange={(e) => setNewItem((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Phase 2 Trooper" />
                </div>
              </div>
              {tab.key === "helmetType" && (
                <div className="space-y-1.5">
                  <Label>Helmet Category <span className="text-muted-foreground font-normal">(combobox group)</span></Label>
                  <Select value={newItem.helmetCategory} onValueChange={(v) => setNewItem((f) => ({ ...f, helmetCategory: v === "__none__" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {helmetCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Requirement <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea value={newItem.requirement} onChange={(e) => setNewItem((f) => ({ ...f, requirement: e.target.value }))} placeholder="Full eligibility requirement…" rows={2} className="resize-none text-sm" />
              </div>
              {((tab.key === "decal" && decalSubCat === "all") || (tab.key === "design" && designSubCat === "all")) && (
                <div className="space-y-1.5">
                  <Label>Group <span className="text-muted-foreground font-normal">(subcategory)</span></Label>
                  <Input value={newItem.subCategory} onChange={(e) => setNewItem((f) => ({ ...f, subCategory: e.target.value }))} placeholder="e.g. Raid Rewards" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input value={newItem.note} onChange={(e) => setNewItem((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. ON HOLD" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialog(null)}>Cancel</Button>
              <Button onClick={() => addItem(tab)} disabled={!newItem.name || !newItem.label || loading === "new"}>
                {loading === "new" ? "Adding…" : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  )
}
