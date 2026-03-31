"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Hammer, Archive, LayoutDashboard, Settings, ShieldBan,
  LogOut, ChevronDown, Database, Users, FileStack,
  PanelLeftClose, PanelLeftOpen, Menu, X, PlusSquare, ShieldCheck,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { signOutAction } from "@/app/actions"
import { useSidebar } from "./sidebar-context"

type NavUser = {
  id: string; name?: string | null; image?: string | null
  isArtTeam: boolean; artTeamTier: string | null; isBlacklisted: boolean; armouryOnly: boolean
}

const TIER_LABELS: Record<string, string> = {
  head: "Head of Art Team",
  senior: "Senior Art Team",
  primary: "Primary Art Team",
  reserve: "Reserve Art Team",
}

const SAT_TIERS = ["head", "senior", "primary"]

const userNav = [
  { href: "/request", label: "New Request", icon: Hammer },
  { href: "/armoury/me", label: "My Armoury", icon: Archive },
]

const artNavBase = [
  { href: "/requests", label: "Overview", icon: LayoutDashboard },
  { href: "/requests/my", label: "My Requests", icon: FileStack },
  { href: "/armoury/all", label: "Full Archive", icon: Database },
  { href: "/art-team", label: "Art Team", icon: Users },
  { href: "/config", label: "Config", icon: Settings },
  { href: "/blacklist", label: "Blacklist", icon: ShieldBan },
]

const satNav = [
  { href: "/armoury/add", label: "Add Helmet", icon: PlusSquare },
  { href: "/art-team/clearances", label: "Clearances", icon: ShieldCheck },
]

function NavItem({ href, label, icon: Icon, collapsed, onClick }: {
  href: string; label: string; icon: React.ElementType; collapsed: boolean; onClick?: () => void
}) {
  const path = usePathname()
  const active = path === href || (href !== "/" && path.startsWith(href + "/"))

  const link = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-md transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        // Default layout (applies on mobile and desktop-expanded)
        "gap-3 px-3 py-2.5 w-full",
        // Desktop when collapsed: icon-only centered square
        collapsed && "md:justify-center md:p-0 md:h-9 md:w-9 md:mx-auto",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {/* Label: always visible on mobile; hidden on desktop when collapsed */}
      <span className={cn("text-sm", collapsed && "md:hidden")}>{label}</span>
    </Link>
  )

  return link
}

function UserFooter({ user, collapsed }: { user: NavUser; collapsed: boolean }) {
  const tierLabel = user.artTeamTier ? TIER_LABELS[user.artTeamTier] ?? user.artTeamTier : null

  return (
    <div className="border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(
            "flex items-center rounded-md text-left hover:bg-sidebar-accent/50 transition-colors w-full",
            "gap-3 px-2 py-2",
            collapsed && "md:justify-center md:px-1 md:gap-0",
          )}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user.image ?? ""} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                {user.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex-1 min-w-0", collapsed && "md:hidden")}>
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name}</p>
              {tierLabel && <p className="text-[10px] text-sidebar-foreground/50 truncate">{tierLabel}</p>}
            </div>
            <ChevronDown className={cn("h-3 w-3 text-sidebar-foreground/40 shrink-0", collapsed && "md:hidden")} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-48">
          {collapsed && tierLabel && (
            <>
              <div className="hidden md:block px-2 py-1.5">
                <p className="text-xs font-medium">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">{tierLabel}</p>
              </div>
              <DropdownMenuSeparator className="hidden md:block" />
            </>
          )}
          <DropdownMenuItem asChild>
            <form action={signOutAction} className="w-full">
              <button type="submit" className="flex w-full items-center gap-2 text-destructive">
                <LogOut className="h-4 w-4" />Sign Out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function SidebarContent({ user, collapsed, onNavClick }: {
  user: NavUser; collapsed: boolean; onNavClick?: () => void
}) {
  const isSAT = user.artTeamTier ? SAT_TIERS.includes(user.artTeamTier) : false
  const artNav = isSAT ? [...artNavBase, ...satNav] : artNavBase

  return (
    <TooltipProvider>
      <ScrollArea className="flex-1 py-4">
        <div className={cn("space-y-1 px-3", collapsed && "md:px-2")}>
          {userNav
            .filter((item) => !(item.href === "/request" && user.armouryOnly))
            .map((item) => (
              <NavItem key={item.href} {...item} collapsed={collapsed} onClick={onNavClick} />
            ))}
        </div>

        {user.isArtTeam && (
          <>
            <div className={cn("my-4 px-3", collapsed && "md:px-2")}>
              <Separator className="bg-sidebar-border" />
            </div>
            <p className={cn(
              "mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40",
              collapsed && "md:hidden",
            )}>
              Art Team
            </p>
            <div className={cn("space-y-1 px-3", collapsed && "md:px-2")}>
              {artNav.map((item) => (
                <NavItem key={item.href} {...item} collapsed={collapsed} onClick={onNavClick} />
              ))}
            </div>
          </>
        )}
      </ScrollArea>
      <UserFooter user={user} collapsed={collapsed} />
    </TooltipProvider>
  )
}

export function AppSidebar({ user }: { user: NavUser }) {
  const { collapsed, setCollapsed, open, setOpen } = useSidebar()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, setOpen])

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      {/* ── Mobile top bar (hidden on desktop) ───────────────── */}
      <div className="fixed top-0 inset-x-0 z-40 flex h-14 items-center gap-3 border-b bg-sidebar px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-sidebar-accent/50 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-sidebar-foreground" />
        </button>
        <Image src="/logo.png" alt="104th Art Team" width={24} height={24} className="shrink-0" />
        <p className="text-sm font-semibold text-sidebar-foreground">Helmet Armoury</p>
      </div>

      {/* Spacer so content isn't hidden behind the fixed mobile bar */}
      <div className="h-14 md:hidden" />

      {/* ── Backdrop (mobile drawer only) ────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden",
          mounted && open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar",
        "transition-[transform,width] duration-300 ease-in-out",
        // Stable defaults — identical on server and initial client render
        "w-72 -translate-x-full md:translate-x-0 md:w-56",
        // Applied only after mount to prevent hydration mismatch
        mounted && open && "translate-x-0",
        mounted && collapsed && "md:w-16",
      )}>
        {/* Header */}
        <div className={cn(
          "flex h-14 items-center border-b border-sidebar-border shrink-0 px-4",
          collapsed ? "md:justify-center md:px-0" : "justify-between",
        )}>
          {/* Logo — visible always on mobile; hidden on desktop when collapsed */}
          <div className={cn("flex items-center gap-2.5 min-w-0", collapsed && "md:hidden")}>
            <Image src="/logo.png" alt="104th Art Team" width={26} height={26} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">104th Art Team</p>
              <p className="truncate text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Helmet Armoury</p>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-sidebar-accent/50 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-sidebar-foreground/70" />
          </button>

          {/* Collapse toggle — desktop only */}
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className={cn(
                    "hidden md:flex items-center justify-center p-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors shrink-0",
                    "text-sidebar-foreground/50 hover:text-sidebar-foreground",
                    collapsed && "mx-auto",
                  )}
                >
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {collapsed ? "Expand" : "Collapse"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <SidebarContent user={user} collapsed={collapsed} onNavClick={() => setOpen(false)} />
      </aside>
    </>
  )
}
