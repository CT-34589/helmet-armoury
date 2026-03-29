"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HelmetImageUpload } from "@/components/helmet-image-upload"

interface User { id: string; name: string | null; image: string | null; discordId: string | null }
interface HelmetType { name: string; label: string; helmetCategory?: string | null }

export function DirectAddForm({ users, helmetTypes, addedById }: {
  users: User[]; helmetTypes: HelmetType[]; addedById: string
}) {
  const router = useRouter()
  const [userOpen, setUserOpen] = useState(false)
  const [helmetOpen, setHelmetOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [helmetType, setHelmetType] = useState("")
  const [completedImageUrl, setCompletedImageUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const selectedHelmet = helmetTypes.find((h) => h.name === helmetType)

  // Group helmet types
  const helmetGroups = new Map<string, HelmetType[]>()
  for (const h of helmetTypes) {
    const key = h.helmetCategory ?? "Other"
    if (!helmetGroups.has(key)) helmetGroups.set(key, [])
    helmetGroups.get(key)!.push(h)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !helmetType || !completedImageUrl) {
      toast.error("Please fill in all fields and upload an image")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/armoury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, helmetType, completedImageUrl, addedById }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed") }
      toast.success(`Helmet added to ${selectedUser?.name}'s armoury`)
      router.push("/armoury/all")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add helmet")
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Trooper */}
      <div className="space-y-2">
        <Label>Trooper <span className="text-destructive">*</span></Label>
        <Popover open={userOpen} onOpenChange={setUserOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal">
              {selectedUser ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5"><AvatarImage src={selectedUser.image ?? ""} /><AvatarFallback className="text-[10px]">{selectedUser.name?.[0]}</AvatarFallback></Avatar>
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
                    <CommandItem key={u.id} value={u.name ?? u.id} onSelect={() => { setSelectedUserId(u.id); setUserOpen(false) }}>
                      <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5"><AvatarImage src={u.image ?? ""} /><AvatarFallback className="text-[10px]">{u.name?.[0]}</AvatarFallback></Avatar>
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

      {/* Helmet type */}
      <div className="space-y-2">
        <Label>Helmet Type <span className="text-destructive">*</span></Label>
        <Popover open={helmetOpen} onOpenChange={setHelmetOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal">
              {selectedHelmet?.label ?? <span className="text-muted-foreground">Select type…</span>}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search types…" />
              <CommandList>
                <CommandEmpty>No types found.</CommandEmpty>
                {Array.from(helmetGroups.entries()).map(([group, items]) => (
                  <CommandGroup key={group} heading={group}>
                    {items.map((h) => (
                      <CommandItem key={h.name} value={`${group} ${h.label}`} onSelect={() => { setHelmetType(h.name); setHelmetOpen(false) }}>
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

      {/* Image upload */}
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
