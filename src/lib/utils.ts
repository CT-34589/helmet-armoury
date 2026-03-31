import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const REQUEST_STATUSES = ["PENDING", "ACCEPTED", "DECLINED", "IN_PROGRESS", "COMPLETED"] as const
export type RequestStatus = typeof REQUEST_STATUSES[number]

export const STATUS_CONFIG: Record<RequestStatus, {
  label: string; color: string; bg: string; border: string; dot: string; step: number
}> = {
  PENDING: {
    label: "Pending Review",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500",
    step: 0,
  },
  ACCEPTED: {
    label: "Accepted",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
    step: 1,
  },
  DECLINED: {
    label: "Declined",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    dot: "bg-destructive",
    step: -1,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-foreground",
    bg: "bg-secondary",
    border: "border-border",
    dot: "bg-primary",
    step: 2,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    step: 3,
  },
}

export function formatDate(date: string | Date) {
  const d = new Date(date)
  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(d)
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false,
  }).format(d)
  return `${datePart}, ${timePart}`
}
