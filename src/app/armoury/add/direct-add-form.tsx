"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { MultiCombobox, type ComboboxOption } from "@/components/ui/multi-combobox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HelmetImageUpload } from "@/components/helmet-image-upload"

interface User { id: string; name: string | null; image: string | null }
interface HelmetType { name: string; label: string; helmetCategory?: string | null }
interface VisorOption { name: string; label: string }

interface Props {
  users: User[]
  helmetTypes: HelmetType[]
  decals: ComboboxOption[]
  designs: ComboboxOption[]
  visorColours: VisorOption[]
  attachments: ComboboxOption[]
  addedById: string
  categoryOrder: string[]
}

export function DirectAddForm({ users, helmetTypes, decals, designs, visorColours, attachments, addedById, categoryOrder = [] }: Props) {
  const router = useRouter()
  const [userOpen, setUserOpen] = useState(false)
  const [helmetOpen, setHelmetOpen] = useState(false)
  const [visorOpen, setVisorOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [helmetType, setHelmetType] = useState("")
  const [selectedDecals, setSelectedDecals] = useState<string[]>([])
  const [selectedDesigns, setSelectedDesigns] = useState<string[]>([])
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([])
  const [visorColour, setVisorColour] = useState("")
  const [battleDamage, setBattleDamage] = useState(false)
  const [custom, setCustom] = useState(false)
  const [customDetails, setCustomDetails] = useState("")
  const [completedImageUrl, setCompletedImageUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const selectedHelmet = helmetTypes.find((h) => h.name === helmetType)
  const selectedVisorLabel = visorColours.find((v) => v.name === visorColour)?.label

  // Group helmet types by category, ordered by categoryOrder (HelmetCategory.sortOrder).
  const helmetGroupMap = new Map<string, HelmetType[]>()
  for (const h of helmetTypes) {
    const key = h.helmetCategory ?? "Other"
    if (!helmetGroupMap.has(key)) helmetGroupMap.set(key, [])
    helmetGroupMap.get(key)!.push(h)
  }
  const orderedCategoryKeys = [
    ...categoryOrder.filter((c) => helmetGroupMap.has(c)),
    ...[...helmetGroupMap.keys()].filter((k) => !categoryOrder.includes(k)),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !helmetType || !completedImageUrl) {
      toast.error("Trooper, helmet type, and image are required")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/armoury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          helmetType,
          decals: selectedDecals,
          designs: selectedDesigns,
          visorColour: visorColour || null,
          attachments: selectedAttachments,
          battleDamage,
          custom,
          customDetails: custom ? customDetails : null,
          completedImageUrl,
          addedById,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed") }
      toast.success(`Helmet added to ${selectedUser?.name ?? "trooper"}'s armoury`)
      router.push("/armoury/all")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add helmet")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Trooper */}
      <div className="space-y-2">
        <Label>Trooper <span className="text-destructive">*</span></Label>
        <Popover open={userOpen} onOpenChange={setUserOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal" disabled={loading}>
              {selectedUser ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedUser.image ?? ""} />
                    <AvatarFallback className="text-[10px]">{selectedUser.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span>{selectedUser.name}</span>
                </div>
              ) : <span className="text-muted-foreground">Select trooper…</span>}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search troopers…" />
              <CommandList className="max-h-56">
                <CommandEmpty>No troopers found.</CommandEmpty>
                <CommandGroup>
                  {users.map((u) => (
                    <CommandItem key={u.id} value={u.name ?? u.id}
                      onSelect={() => { setSelectedUserId(u.id); setUserOpen(false) }}>
                      <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={u.image ?? ""} />
                          <AvatarFallback className="text-[10px]">{u.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {u.name}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Helmet Type */}
      <div className="space-y-2">
        <Label>Helmet Type <span className="text-destructive">*</span></Label>
        <Popover open={helmetOpen} onOpenChange={setHelmetOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between font-normal" disabled={loading}>
              {selectedHelmet?.label ?? <span className="text-muted-foreground">Select helmet type…</span>}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search types…" />
              <CommandList>
                <CommandEmpty>No types found.</CommandEmpty>
                {orderedCategoryKeys.map((group) => (
                  <CommandGroup key={group} heading={group}>
                    {helmetGroupMap.get(group)!.map((h) => (
                      <CommandItem key={h.name} value={`${group} ${h.label}`}
                        onSelect={() => { setHelmetType(h.name); setHelmetOpen(false) }}>
                        <Check className={cn("mr-2 h-4 w-4", helmetType === h.name ? "opacity-100" : "opacity-0")} />
                        {h.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      {/* Decals */}
      <div className="space-y-2">
        <Label>Decals</Label>
        <MultiCombobox options={decals} value={selectedDecals} onChange={setSelectedDecals}
          placeholder="Search and select decals…" searchPlaceholder="Search decals…" />
      </div>

      <Separator />

      {/* Designs */}
      <div className="space-y-2">
        <Label>Designs</Label>
        <MultiCombobox options={designs} value={selectedDesigns} onChange={setSelectedDesigns}
          placeholder="Search and select designs…" searchPlaceholder="Search designs…" />
      </div>

      {/* Visor Colour */}
      {visorColours.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label>Visor Colour <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Popover open={visorOpen} onOpenChange={setVisorOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal" disabled={loading}>
                  {selectedVisorLabel ?? <span className="text-muted-foreground">No preference…</span>}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search colours…" />
                  <CommandList>
                    <CommandEmpty>No colours found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="none" onSelect={() => { setVisorColour(""); setVisorOpen(false) }}>
                        <Check className={cn("mr-2 h-4 w-4", !visorColour ? "opacity-100" : "opacity-0")} />
                        <span className="text-muted-foreground">No preference</span>
                      </CommandItem>
                      {visorColours.map((v) => (
                        <CommandItem key={v.name} value={v.label}
                          onSelect={() => { setVisorColour(v.name); setVisorOpen(false) }}>
                          <Check className={cn("mr-2 h-4 w-4", visorColour === v.name ? "opacity-100" : "opacity-0")} />
                          {v.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label>Attachments <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <MultiCombobox options={attachments} value={selectedAttachments} onChange={setSelectedAttachments}
              placeholder="Search and select attachments…" searchPlaceholder="Search attachments…" />
          </div>
        </>
      )}

      <Separator />

      {/* Options */}
      <div className="space-y-3">
        <Label>Options</Label>
        <div className="flex items-center justify-between rounded-md border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Battle Damage</p>
            <p className="text-xs text-muted-foreground">Requires 1 consecutive year in a platoon</p>
          </div>
          <Switch checked={battleDamage} onCheckedChange={setBattleDamage} disabled={loading} />
        </div>
        <div className="flex items-center justify-between rounded-md border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Custom Elements</p>
            <p className="text-xs text-muted-foreground">Describe any special customisations</p>
          </div>
          <Switch checked={custom} onCheckedChange={setCustom} disabled={loading} />
        </div>
        {custom && (
          <Textarea value={customDetails} onChange={(e) => setCustomDetails(e.target.value)}
            placeholder="Describe what was customised…" rows={3} disabled={loading} />
        )}
      </div>

      <Separator />

      {/* Image Upload */}
      <div className="space-y-2">
        <Label>Completed Helmet Image <span className="text-destructive">*</span></Label>
        <HelmetImageUpload onUpload={setCompletedImageUrl} />
      </div>

      <Button type="submit" disabled={loading || !selectedUserId || !helmetType || !completedImageUrl} className="w-full">
        {loading ? "Adding…" : "Add to Armoury"}
      </Button>
    </form>
  )
}
