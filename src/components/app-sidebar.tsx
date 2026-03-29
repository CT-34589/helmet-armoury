"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
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
  isArtTeam: boolean; artTeamTier: string | null; isBlacklisted: boolean
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

function NavItem({ href, label, icon: Icon, collapsed }: {
  href: string; label: string; icon: React.ElementType; collapsed: boolean
}) {
  const path = usePathname()
  const active = path === href || (href !== "/" && path.startsWith(href + "/"))

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link href={href} className={cn(
            "flex items-center justify-center h-9 w-9 rounded-md transition-colors mx-auto",
            active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}>
            <Icon className="h-4 w-4 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link href={href} className={cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
      active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
    )}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

function UserFooter({ user, collapsed }: { user: NavUser; collapsed: boolean }) {
  const tierLabel = user.artTeamTier ? TIER_LABELS[user.artTeamTier] ?? user.artTeamTier : null

  const dropdownContent = (
    <DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "center" : "start"} className="w-48">
      {collapsed && tierLabel && (
        <>
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium">{user.name}</p>
            <p className="text-[10px] text-muted-foreground">{tierLabel}</p>
          </div>
          <DropdownMenuSeparator />
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
  )

  if (collapsed) {
    return (
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center w-full rounded-md p-1 hover:bg-sidebar-accent/50 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.image ?? ""} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">{user.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          {dropdownContent}
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className="border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-sidebar-accent/50 transition-colors">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user.image ?? ""} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">{user.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name}</p>
              {tierLabel && <p className="text-[10px] text-sidebar-foreground/50 truncate">{tierLabel}</p>}
            </div>
            <ChevronDown className="h-3 w-3 text-sidebar-foreground/40 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        {dropdownContent}
      </DropdownMenu>
    </div>
  )
}

function SidebarContent({ user, collapsed }: { user: NavUser; collapsed: boolean }) {
  const isSAT = user.artTeamTier ? SAT_TIERS.includes(user.artTeamTier) : false
  const artNav = isSAT ? [...artNavBase, ...satNav] : artNavBase

  return (
    <TooltipProvider>
      <ScrollArea className="flex-1 py-4">
        <div className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
          {userNav.map((item) => <NavItem key={item.href} {...item} collapsed={collapsed} />)}
        </div>

        {user.isArtTeam && (
          <>
            <div className={cn("my-4", collapsed ? "px-2" : "px-3")}>
              <Separator className="bg-sidebar-border" />
            </div>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                Art Team
              </p>
            )}
            <div className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
              {artNav.map((item) => <NavItem key={item.href} {...item} collapsed={collapsed} />)}
            </div>
          </>
        )}
      </ScrollArea>
      <UserFooter user={user} collapsed={collapsed} />
    </TooltipProvider>
  )
}

export function AppSidebar({ user }: { user: NavUser }) {
  const { collapsed, setCollapsed, open, setOpen, isMobile } = useSidebar()

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b bg-sidebar px-4">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors">
            <Menu className="h-5 w-5 text-sidebar-foreground" />
          </button>
          <Image src="/logo.png" alt="104th Art Team" width={24} height={24} className="shrink-0" />
          <p className="text-sm font-semibold text-sidebar-foreground">Helmet Armoury</p>
        </div>
        <div className="h-14" />
        {open && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="104th Art Team" width={26} height={26} />
              <div>
                <p className="text-xs font-semibold text-sidebar-foreground">104th Art Team</p>
                <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Helmet Armoury</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-sidebar-accent/50 transition-colors">
              <X className="h-4 w-4 text-sidebar-foreground/70" />
            </button>
          </div>
          <SidebarContent user={user} collapsed={false} />
        </aside>
      </>
    )
  }

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-56"
    )}>
      <div className={cn(
        "flex h-14 items-center border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center px-0" : "justify-between px-4"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <Image src="/logo.png" alt="104th Art Team" width={26} height={26} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">104th Art Team</p>
              <p className="truncate text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Helmet Armoury</p>
            </div>
          </div>
        )}
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn("p-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground", collapsed && "mx-auto")}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{collapsed ? "Expand" : "Collapse"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <SidebarContent user={user} collapsed={collapsed} />
    </aside>
  )
}
