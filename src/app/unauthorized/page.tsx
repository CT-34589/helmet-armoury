import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

interface Props {
  searchParams: Promise<{ reason?: string }>
}

const messages: Record<string, string> = {
  inactive: "You must have an active company or staff role in the 104th to access this system.",
  blacklisted: "Your account has been blacklisted from the Helmet Armoury.",
  default: "You don't have permission to access this page.",
}

export default async function UnauthorizedPage({ searchParams }: Props) {
  const { reason } = await searchParams
  const message = messages[reason ?? "default"] ?? messages.default

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="104th Art Team" width={48} height={48} className="opacity-60" />
          <div className="rounded-full border border-destructive/30 bg-destructive/10 p-3">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">401</p>
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Sign in with a different account</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            If you believe this is an error, contact an Art Team member.
          </p>
        </div>
      </div>
    </div>
  )
}
