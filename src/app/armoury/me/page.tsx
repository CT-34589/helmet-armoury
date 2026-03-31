import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getItemLabelMap, resolveLabels } from "@/lib/label-lookup"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CompletedTable } from "./completed-table"
import { ActiveRequestTracker } from "./active-request-tracker"
import {Card, CardContent} from "@/components/ui/card";
import {StatusBadge} from "@/components/status-tracker";
import {formatDate} from "@/lib/utils";

export default async function MyArmouryPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const [requests, labelMap] = await Promise.all([
    prisma.request.findMany({
      where: { userId: session.user.id },
      include: { artist: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getItemLabelMap(),
  ])

  const active = requests.filter((r) => r.status !== "COMPLETED" && r.status !== "DECLINED")
  const completed = requests.filter((r) => r.status === "COMPLETED")
  const declined = requests.filter((r) => r.status === "DECLINED")

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Armoury</h1>
          <p className="text-sm text-muted-foreground">
            {completed.length} helmet{completed.length !== 1 ? "s" : ""} completed
          </p>
        </div>
        {!session.user.isBlacklisted && (
          <Button asChild size="sm">
            <Link href="/request"><Plus className="h-4 w-4" />New Request</Link>
          </Button>
        )}
      </div>

      {session.user.isBlacklisted && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Your account has been blacklisted. You cannot submit new requests.
        </div>
      )}

      {/* Active requests */}
      <ActiveRequestTracker initialRequests={active.map((r) => ({
        id: r.id,
        helmetType: labelMap[r.helmetType] ?? r.helmetType,
        status: r.status,
        artistName: r.artist?.name ?? null,
        declineReason: r.declineReason ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))} />

      {/* Completed — clickable table, image in side sheet */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Completed — {completed.length}
          </h2>
          <CompletedTable
            requests={completed.map((r) => ({
              id: r.id,
              helmetType: labelMap[r.helmetType] ?? r.helmetType,
              artistName: r.artist?.name ?? null,
              completedImageUrl: r.completedImageUrl,
              createdAt: r.createdAt.toISOString(),
              decals: resolveLabels(JSON.parse(r.decals) as string[], labelMap),
              designs: resolveLabels(JSON.parse(r.designs) as string[], labelMap),
              visorColour: r.visorColour ? (labelMap[r.visorColour] ?? r.visorColour) : null,
              attachments: resolveLabels(JSON.parse(r.attachments ?? "[]") as string[], labelMap),
              battleDamage: r.battleDamage,
              custom: r.custom,
              customDetails: r.customDetails,
            }))}
          />
        </div>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Declined</h2>
          <div className="space-y-2">
            {declined.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {labelMap[r.helmetType] ?? r.helmetType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{r.id.slice(-8)} · {formatDate(r.createdAt)}
                      {r.declineReason && ` · ${r.declineReason}`}
                    </p>
                  </div>
                  <StatusBadge status="DECLINED" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm mb-4">No requests yet.</p>
          <Button asChild size="sm">
            <Link href="/request"><Plus className="h-4 w-4" />Make your first request</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
