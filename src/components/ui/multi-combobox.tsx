"use client"
import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface ComboboxOption {
  value: string
  label: string
  subCategory?: string
  requirement?: string
}

interface MultiComboboxProps {
  options: ComboboxOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  maxShown?: number
}

export function MultiCombobox({
  options, value, onChange, placeholder = "Select…",
  searchPlaceholder = "Search…", className, maxShown = 3,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  // Group options by subCategory
  const groups = React.useMemo(() => {
    const map = new Map<string, ComboboxOption[]>()
    for (const opt of options) {
      const key = opt.subCategory ?? "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(opt)
    }
    return map
  }, [options])

  const groupKeys = Array.from(groups.keys())
  const selectedLabels = value.map((v) => options.find((o) => o.value === v)?.label ?? v)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("min-h-9 h-auto w-full justify-between font-normal flex-wrap gap-1 py-1.5 px-2", className)}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground text-sm px-1">{placeholder}</span>
            ) : (
              <>
                {selectedLabels.slice(0, maxShown).map((label, i) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
                    {label}
                    <span
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                      onClick={(e) => { e.stopPropagation(); toggle(value[i]) }}
                      className="rounded-sm opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  </Badge>
                ))}
                {value.length > maxShown && (
                  <Badge variant="outline" className="text-xs">+{value.length - maxShown} more</Badge>
                )}
              </>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            <CommandEmpty>No results found.</CommandEmpty>
            {groupKeys.map((group, gi) => (
              <React.Fragment key={group}>
                {gi > 0 && <CommandSeparator />}
                <CommandGroup heading={group}>
                  {groups.get(group)!.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.requirement ?? ""}`}
                      onSelect={() => toggle(opt.value)}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Check className={cn("h-4 w-4 shrink-0", value.includes(opt.value) ? "opacity-100" : "opacity-0")} />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </div>
                      {opt.requirement && (
                        <p className="text-xs text-muted-foreground pl-6 leading-relaxed line-clamp-2">
                          {opt.requirement}
                        </p>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
