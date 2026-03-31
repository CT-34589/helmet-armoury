"use client"
import { useSidebar } from "./sidebar-context"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <main className={cn(
      "flex-1 min-h-screen transition-[margin-left] duration-300 ease-in-out",
      // Mobile: no left margin, push content below the fixed top bar
      "ml-0 pt-14",
      // Desktop: left margin matches sidebar width, no top offset
      collapsed ? "md:ml-16 md:pt-0" : "md:ml-56 md:pt-0",
    )}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8 pb-safe">
        {children}
      </div>
    </main>
  )
}
