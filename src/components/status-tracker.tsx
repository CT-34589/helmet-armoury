import { cn } from "@/lib/utils"
import type { RequestStatus } from "@/lib/utils"

// The 4 progress bars. PENDING sits before bar 1 (all empty).
// Each bar can have different labels depending on whether it's active (yellow) or done (green/muted).
const BARS = [
  { active: "Approved",            done: "Approved" },
  { active: "Waiting for Artist",  done: "Artist Assigned" },
  { active: "In Progress",         done: "In Progress" },
  { active: "Complete",            done: "Complete" },
]

// How many bars are GREEN (done) and which bar (if any) is YELLOW (active) per status.
const BAR_STATE: Record<RequestStatus, { green: number; yellow: number | null }> = {
  PENDING:     { green: 0, yellow: null },
  ACCEPTED:    { green: 1, yellow: 1 },   // bar 0 green, bar 1 yellow
  IN_PROGRESS: { green: 2, yellow: 2 },   // bars 0-1 green, bar 2 yellow
  COMPLETED:   { green: 4, yellow: null },
  DECLINED:    { green: 0, yellow: null },
}

export function StatusTracker({ status }: { status: RequestStatus }) {
  const isDeclined = status === "DECLINED"
  const { green, yellow } = BAR_STATE[status]

  return (
    <div className="space-y-1.5">
      {status === "PENDING" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
          Submitted — awaiting review
        </div>
      )}
      {isDeclined && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          Declined
        </div>
      )}
      <div className="flex gap-1">
        {BARS.map((bar, i) => {
          let barColor: string
          if (isDeclined) {
            barColor = "bg-destructive"
          } else if (i < green) {
            barColor = "bg-emerald-500"
          } else if (i === yellow) {
            barColor = "bg-yellow-500"
          } else {
            barColor = "bg-muted"
          }

          const isAnimated = !isDeclined && i === yellow

          return (
            <div key={bar.done} className="flex-1 space-y-1">
              <div className={cn("relative h-1 rounded-full overflow-hidden transition-colors", barColor)}>
                {isAnimated && (
                  <div className="absolute inset-y-0 w-3/4 bg-gradient-to-r from-transparent via-yellow-200/90 to-transparent animate-bar-sweep" />
                )}
              </div>
              <p className={cn(
                "text-[10px] leading-none",
                i === yellow ? "text-foreground font-medium" : "text-muted-foreground",
                isDeclined && "opacity-50",
                status === "COMPLETED" && "text-muted-foreground font-normal",
              )}>
                {i === yellow ? bar.active : bar.done}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, { label: string; class: string }> = {
    PENDING:     { label: "Submitted",   class: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500" },
    ACCEPTED:    { label: "Approved",    class: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
    DECLINED:    { label: "Declined",    class: "border-destructive/30 bg-destructive/10 text-destructive" },
    IN_PROGRESS: { label: "In Progress", class: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" },
    COMPLETED:   { label: "Complete",    class: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" },
  }
  const cfg = map[status]
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", cfg.class)}>
      {cfg.label}
    </span>
  )
}
