import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full border border-border bg-muted/30 p-4">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">404</p>
          <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground mt-1">
            This page doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/armoury/me">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
