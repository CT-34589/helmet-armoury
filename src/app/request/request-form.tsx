"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Info, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { MultiCombobox, type ComboboxOption } from "@/components/ui/multi-combobox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface HelmetOption { name: string; label: string; helmetCategory?: string | null; standard: boolean }
interface VisorOption { name: string; label: string; requirement?: string }
interface ArtistOption { id: string; name: string | null; image: string | null }
interface WeightedOption extends ComboboxOption { slotWeight?: number }
interface Props {
  helmetTypes: HelmetOption[]
  decals: WeightedOption[]
  designs: WeightedOption[]
  visorColours: VisorOption[]
  attachments: ComboboxOption[]
  artTeamMembers: ArtistOption[]
  hasCustomHelmetAccess: boolean
  standardDecalLimit: number   // 0 = unlimited
  standardDesignLimit: number  // 0 = unlimited
  nonStandardDecalLimit: number
  nonStandardDesignLimit: number
  categoryOrder: string[]
}

type Step = "idle" | "validating" | "uploading-evidence" | "submitting" | "done" | "error"

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  validating: "Checking eligibility…",
  "uploading-evidence": "Sending evidence to Discord…",
  submitting: "Submitting request…",
  done: "Request submitted!",
  error: "Something went wrong",
}

const STEP_ORDER: Step[] = ["validating", "uploading-evidence", "submitting", "done"]

export function RequestForm({ helmetTypes, decals, designs, visorColours, attachments, artTeamMembers, hasCustomHelmetAccess, standardDecalLimit, standardDesignLimit, nonStandardDecalLimit, nonStandardDesignLimit, categoryOrder }: Props) {
  const router = useRouter()
  const evidenceInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("idle")
  const [progress, setProgress] = useState(0)
  const [helmetOpen, setHelmetOpen] = useState(false)
  const [artistOpen, setArtistOpen] = useState(false)
  const [visorOpen, setVisorOpen] = useState(false)
  const [helmetType, setHelmetType] = useState("")
  const [selectedDecals, setSelectedDecals] = useState<string[]>([])
  const [selectedDesigns, setSelectedDesigns] = useState<string[]>([])
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([])
  const [visorColour, setVisorColour] = useState("")
  const [battleDamage, setBattleDamage] = useState(false)
  const [custom, setCustom] = useState(false)
  const [customDetails, setCustomDetails] = useState("")
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([])
  const [evidenceNote, setEvidenceNote] = useState("")
  const [requestedArtistId, setRequestedArtistId] = useState("")

  // Group helmet types by category, ordered by categoryOrder (HelmetCategory.sortOrder).
  const helmetGroupMap = new Map<string, HelmetOption[]>()
  for (const h of helmetTypes) {
    const key = h.helmetCategory ?? "Other"
    if (!helmetGroupMap.has(key)) helmetGroupMap.set(key, [])
    helmetGroupMap.get(key)!.push(h)
  }
  // Render groups in the order defined by HelmetCategory.sortOrder; unknown categories appended last.
  const orderedCategoryKeys = [
    ...categoryOrder.filter((c) => helmetGroupMap.has(c)),
    ...[...helmetGroupMap.keys()].filter((k) => !categoryOrder.includes(k)),
  ]

  const selectedHelmet = helmetTypes.find((h) => h.name === helmetType)
  const selectedHelmetLabel = selectedHelmet?.label
  const isNonStandard = selectedHelmet ? !selectedHelmet.standard : false
  const decalSlotLimit = isNonStandard ? nonStandardDecalLimit : standardDecalLimit
  const designSlotLimit = isNonStandard ? nonStandardDesignLimit : standardDesignLimit
  const selectedVisorLabel = visorColours.find((v) => v.name === visorColour)?.label
  const selectedArtist = artTeamMembers.find((a) => a.id === requestedArtistId)
  const isSubmitting = step !== "idle" && step !== "error"
  const stepIdx = STEP_ORDER.indexOf(step)

  const usedDecalSlots = selectedDecals.reduce((sum, v) => sum + (decals.find((d) => d.value === v)?.slotWeight ?? 1), 0)
  const usedDesignSlots = selectedDesigns.reduce((sum, v) => sum + (designs.find((d) => d.value === v)?.slotWeight ?? 1), 0)
  const decalSlotsExceeded = decalSlotLimit > 0 && usedDecalSlots > decalSlotLimit
  const designSlotsExceeded = designSlotLimit > 0 && usedDesignSlots > designSlotLimit
  const slotsExceeded = decalSlotsExceeded || designSlotsExceeded

  const handleDecalChange = (next: string[]) => {
    if (decalSlotLimit > 0) {
      const total = next.reduce((sum, v) => sum + (decals.find((d) => d.value === v)?.slotWeight ?? 1), 0)
      if (total > decalSlotLimit) { toast.error(`Only ${decalSlotLimit} decal slot${decalSlotLimit !== 1 ? "s" : ""} available`); return }
    }
    setSelectedDecals(next)
  }

  const handleDesignChange = (next: string[]) => {
    if (designSlotLimit > 0) {
      const total = next.reduce((sum, v) => sum + (designs.find((d) => d.value === v)?.slotWeight ?? 1), 0)
      if (total > designSlotLimit) { toast.error(`Only ${designSlotLimit} design slot${designSlotLimit !== 1 ? "s" : ""} available`); return }
    }
    setSelectedDesigns(next)
  }

  const MAX_EVIDENCE = 10
  const handleEvidenceFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    const images = arr.filter((f) => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); return false }
      return true
    })
    setEvidenceFiles((prev) => {
      const combined = [...prev, ...images].slice(0, MAX_EVIDENCE)
      if (prev.length + images.length > MAX_EVIDENCE) toast.info(`Only ${MAX_EVIDENCE} images allowed — extras were dropped`)
      // Generate previews for newly added
      combined.slice(prev.length).forEach((f, i) => {
        const reader = new FileReader()
        reader.onload = (e) => setEvidencePreviews((p) => {
          const next = [...p]
          next[prev.length + i] = e.target?.result as string
          return next
        })
        reader.readAsDataURL(f)
      })
      return combined
    })
  }
  const removeEvidenceFile = (idx: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx))
    setEvidencePreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const advanceTo = (s: Step, pct: number) => { setStep(s); setProgress(pct) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    advanceTo("validating", 10)
    if (!helmetType) {
      setStep("error")
      toast.error("Please select a helmet type")
      return
    }
    await new Promise((r) => setTimeout(r, 300))
    setProgress(33)

    let evidenceUrl: string | undefined
    if (evidenceFiles.length > 0 || evidenceNote) {
      advanceTo("uploading-evidence", 40)
      try {
        const fd = new FormData()
        fd.append("note", evidenceNote)
        fd.append("requestId", "pending")
        evidenceFiles.forEach((f, i) => fd.append(`file_${i}`, f, f.name))

        const res = await fetch("/api/evidence", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Evidence upload failed")
        evidenceUrl = data.messageUrl
        setProgress(66)
      } catch (err: unknown) {
        setStep("error")
        toast.error(err instanceof Error ? err.message : "Failed to send evidence to Discord")
        return
      }
    } else {
      setProgress(66)
    }

    advanceTo("submitting", 75)
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helmetType,
          decals: selectedDecals,
          designs: selectedDesigns,
          visorColour: visorColour || null,
          attachments: selectedAttachments,
          battleDamage,
          custom,
          customDetails,
          evidenceUrl: evidenceUrl ?? null,
          evidenceNote: evidenceNote || null,
          requestedArtistId: requestedArtistId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to submit request")

      advanceTo("done", 100)
      toast.success("Request submitted successfully!")
      await new Promise((r) => setTimeout(r, 800))
      router.push("/armoury/me")
      router.refresh()
    } catch (err: unknown) {
      setStep("error")
      toast.error(err instanceof Error ? err.message : "Failed to submit request")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Helmet Type */}
      <div className="space-y-2">
        <Label>Helmet Type <span className="text-destructive">*</span></Label>
        <Popover open={helmetOpen} onOpenChange={setHelmetOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between font-normal" disabled={isSubmitting}>
              {selectedHelmetLabel ?? "Select helmet type…"}
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
        <div className="flex items-baseline justify-between">
          <Label>Decals</Label>
          {decalSlotLimit > 0 && (
            <span className={cn("text-xs", usedDecalSlots > decalSlotLimit ? "text-destructive" : "text-muted-foreground")}>
              {usedDecalSlots} / {decalSlotLimit} slots
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Select all you are eligible for. Requirements shown in the dropdown.</p>
        <MultiCombobox options={decals} value={selectedDecals} onChange={handleDecalChange}
          placeholder="Search and select decals…" searchPlaceholder="Search decals…"
          className={decalSlotsExceeded ? "border-destructive" : undefined} />
      </div>

      <Separator />

      {/* Designs */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label>Designs</Label>
          {designSlotLimit > 0 && (
            <span className={cn("text-xs", usedDesignSlots > designSlotLimit ? "text-destructive" : "text-muted-foreground")}>
              {usedDesignSlots} / {designSlotLimit} slots
            </span>
          )}
        </div>
        <MultiCombobox options={designs} value={selectedDesigns} onChange={handleDesignChange}
          placeholder="Search and select designs…" searchPlaceholder="Search designs…"
          className={designSlotsExceeded ? "border-destructive" : undefined} />
      </div>

      {/* Visor Colour — only shown if configured */}
      {visorColours.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label>Visor Colour <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Popover open={visorOpen} onOpenChange={setVisorOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal" disabled={isSubmitting}>
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
                          <div>
                            <p>{v.label}</p>
                            {v.requirement && <p className="text-xs text-muted-foreground">{v.requirement}</p>}
                          </div>
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

      {/* Attachments — only shown if configured */}
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
          <Switch checked={battleDamage} onCheckedChange={setBattleDamage} disabled={isSubmitting} />
        </div>
        {hasCustomHelmetAccess && (
          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Custom Elements</p>
              <p className="text-xs text-muted-foreground">Describe any special customisations</p>
            </div>
            <Switch checked={custom} onCheckedChange={setCustom} disabled={isSubmitting} />
          </div>
        )}
        {custom && (
          <Textarea value={customDetails} onChange={(e) => setCustomDetails(e.target.value)}
            placeholder="Describe what you'd like customised…" rows={3} disabled={isSubmitting} />
        )}
      </div>

      <Separator />

      {/* Evidence */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label>Evidence <span className="text-muted-foreground font-normal">(optional)</span></Label>
          {evidenceFiles.length > 0 && (
            <span className="text-xs text-muted-foreground">{evidenceFiles.length} / {MAX_EVIDENCE} images · images are compressed before sending</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Required for rank-restricted items and battle damage. Sent to the Art Team Discord channel when you submit.
        </p>

        {/* Thumbnail grid */}
        {evidenceFiles.length > 0 && (
          <div className="grid grid-cols-5 gap-2">
            {evidenceFiles.map((f, i) => (
              <div key={i} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {evidencePreviews[i] && <img src={evidencePreviews[i]} alt={f.name} className="w-full h-full object-cover" />}
                <button
                  type="button"
                  onClick={() => removeEvidenceFile(i)}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone — only show when under limit */}
        {evidenceFiles.length < MAX_EVIDENCE && (
          <div
            onClick={() => evidenceInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleEvidenceFiles(e.dataTransfer.files) }}
            className={cn(
              "border-2 border-dashed rounded-md cursor-pointer transition-colors",
              "flex flex-col items-center justify-center gap-2 min-h-[72px] p-3",
              "border-border hover:border-border/80",
              isSubmitting && "pointer-events-none opacity-60"
            )}
          >
            <input ref={evidenceInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) handleEvidenceFiles(e.target.files); e.target.value = "" }} />
            <Upload className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {evidenceFiles.length === 0 ? "Drop screenshots here or click to browse" : "Add more images…"}
            </p>
          </div>
        )}

        <Textarea value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)}
          placeholder="Add any context or explanation for the Art Team… (optional)"
          rows={2} className="text-sm resize-none" disabled={isSubmitting} />
      </div>

      <Separator />

      {/* Preferred Artist */}
      <div className="space-y-2">
        <Label>Preferred Artist <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Popover open={artistOpen} onOpenChange={setArtistOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal" disabled={isSubmitting}>
              {selectedArtist ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedArtist.image ?? ""} />
                    <AvatarFallback className="text-[10px]">{selectedArtist.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span>{selectedArtist.name}</span>
                </div>
              ) : <span className="text-muted-foreground">No preference…</span>}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search artists…" />
              <CommandList>
                <CommandEmpty>No artists found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="none" onSelect={() => { setRequestedArtistId(""); setArtistOpen(false) }}>
                    <Check className={cn("mr-2 h-4 w-4", !requestedArtistId ? "opacity-100" : "opacity-0")} />
                    <span className="text-muted-foreground">No preference</span>
                  </CommandItem>
                  {artTeamMembers.map((a) => (
                    <CommandItem key={a.id} value={a.name ?? a.id}
                      onSelect={() => { setRequestedArtistId(a.id); setArtistOpen(false) }}>
                      <Check className={cn("mr-2 h-4 w-4", requestedArtistId === a.id ? "opacity-100" : "opacity-0")} />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={a.image ?? ""} />
                          <AvatarFallback className="text-[10px]">{a.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {a.name}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Info box */}
      <div className="rounded-md border bg-muted/30 p-3 flex gap-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p><span className="text-foreground">SGM+ / SL+</span> — Custom Helmet</p>
          <p><span className="text-foreground">SGT / FCPT</span> — 4 Designs + 1 Decal</p>
          <p><span className="text-foreground">CPL / LCPL / FL / FO</span> — 3 Designs + 1 Decal</p>
          <p><span className="text-foreground">CT / PO</span> — 2 Designs + 1 Decal</p>
        </div>
      </div>

      {/* Progress */}
      {step !== "idle" && (
        <div className="space-y-2">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                step === "error" ? "bg-destructive" : step === "done" ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            {step !== "error" && step !== "done" && (
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            <p className={cn(
              "text-xs",
              step === "error" ? "text-destructive" : step === "done" ? "text-emerald-500" : "text-muted-foreground"
            )}>
              {STEP_LABELS[step]}
            </p>
          </div>
          <div className="flex gap-2">
            {["Validate", "Evidence", "Submit"].map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn(
                  "h-1.5 w-8 rounded-full",
                  stepIdx >= i ? (step === "error" ? "bg-destructive" : "bg-primary") : "bg-muted"
                )} />
                <span className={cn("text-[10px]", stepIdx >= i ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting || slotsExceeded} className="w-full">
        {isSubmitting && step !== "done" ? "Processing…" : "Submit Request"}
      </Button>
    </form>
  )
}
