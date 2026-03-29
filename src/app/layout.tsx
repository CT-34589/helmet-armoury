import type { Metadata } from "next"
import "./globals.css"
import { auth } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { AppShell } from "@/components/app-shell"
import { SidebarProvider } from "@/components/sidebar-context"
import { Toaster } from "@/components/ui/sonner"
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "104th Art Team — Helmet Armoury",
  description: "Request and manage custom helmets for the 104th Battalion",
  icons: { icon: "/logo.png" },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="en" className={cn("dark", "font-sans", inter.variable)} suppressHydrationWarning>
      <body>
        {session?.user ? (
          <SidebarProvider>
            <div className="flex min-h-screen">
              <AppSidebar
                user={{
                  id: session.user.id!,
                  name: session.user.name,
                  image: session.user.image,
                  isArtTeam: session.user.isArtTeam ?? false,
                  artTeamTier: session.user.artTeamTier ?? null,
                  isBlacklisted: session.user.isBlacklisted ?? false,
                }}
              />
              <AppShell>{children}</AppShell>
            </div>
          </SidebarProvider>
        ) : (
          <main>{children}</main>
        )}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
