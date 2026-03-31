"use client"
import { createContext, useContext, useState, useEffect } from "react"

interface SidebarContextValue {
  open: boolean
  setOpen: (v: boolean) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  setOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) setCollapsed(saved === "true")
  }, [])

  const handleSetCollapsed = (v: boolean) => {
    setCollapsed(v)
    localStorage.setItem("sidebar-collapsed", String(v))
  }

  return (
    <SidebarContext.Provider value={{ open, setOpen, collapsed, setCollapsed: handleSetCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
