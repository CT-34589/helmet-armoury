"use client"
import { createContext, useContext, useState, useEffect } from "react"

interface SidebarContextValue {
  open: boolean
  setOpen: (v: boolean) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  isMobile: boolean
}

const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  setOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
  isMobile: false,
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)         // mobile sheet open
  const [collapsed, setCollapsed] = useState(false) // desktop collapsed
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    handler(mq)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Persist desktop collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) setCollapsed(saved === "true")
  }, [])

  const handleSetCollapsed = (v: boolean) => {
    setCollapsed(v)
    localStorage.setItem("sidebar-collapsed", String(v))
  }

  return (
    <SidebarContext.Provider value={{ open, setOpen, collapsed, setCollapsed: handleSetCollapsed, isMobile }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
