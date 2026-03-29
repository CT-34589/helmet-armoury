import { cn } from "@/lib/utils"
import type { RequestStatus } from "@/lib/utils"

const STAGES = [
  { key: "PENDING", label: "Submitted" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
] as const

export function StatusTracker({ status }: { status: RequestStatus }) {
  const isDeclined = status === "DECLINED"
  const currentIdx = STAGES.findIndex((s) => s.key === status)

  return (
    <div className="space-y-1.5">
      {isDeclined && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
          Declined
        </div>
      )}
      <div className="flex gap-1">
        {STAGES.map((stage, i) => {
          const isPast = i < currentIdx && !isDeclined
          const isCurrent = i === currentIdx && !isDeclined
          const color = isDeclined
            ? i === 0 ? "bg-destructive" : "bg-muted"
            : isPast ? "bg-emerald-500"
            : isCurrent ? i === 0 ? "bg-yellow-500" : "bg-primary"
            : "bg-muted"

          return (
            <div key={stage.key} className="flex-1 space-y-1">
              <div className={cn("h-1 rounded-full transition-colors", color)} />
              <p className={cn(
                "text-[10px] leading-none",
                isCurrent && !isDeclined ? "text-foreground font-medium" : "text-muted-foreground",
                isDeclined && i > 0 && "opacity-30"
              )}>
                {stage.label}
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
    PENDING: { label: "Pending", class: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500" },
    ACCEPTED: { label: "Accepted", class: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
    DECLINED: { label: "Declined", class: "border-destructive/30 bg-destructive/10 text-destructive" },
    IN_PROGRESS: { label: "In Progress", class: "border-primary/30 bg-primary/10 text-foreground" },
    COMPLETED: { label: "Completed", class: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" },
  }
  const cfg = map[status]
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", cfg.class)}>
      {cfg.label}
    </span>
  )
}
