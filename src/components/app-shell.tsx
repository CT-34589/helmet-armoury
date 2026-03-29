"use client"
import { useSidebar } from "./sidebar-context"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed, isMobile } = useSidebar()
  return (
    <main
      className={cn(
        "flex-1 overflow-auto transition-all duration-300",
        isMobile ? "ml-0 pt-14" : collapsed ? "ml-16" : "ml-56"
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8">
        {children}
      </div>
    </main>
  )
}