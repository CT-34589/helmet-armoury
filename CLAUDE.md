# CLAUDE.md — 104th Art Team Helmet Armoury

This file gives Claude Code full context about this project so it can continue development without needing the original conversation history.

---

## What this app is

A web app for the **104th Battalion** Star Wars Battlefront II gaming community. The Art Team makes custom Discord profile picture "helmets" for members. This app manages the full request-to-delivery pipeline.

**Who uses it:**
- **Regular members** — submit requests, view their armoury, download completed helmets
- **Art Team members** — review requests, assign work, upload completed helmets
- **Art Team leads (SAT+)** — all of the above plus direct-add helmets, manage team membership, configure the system

---

## Tech stack

- **Framework**: Next.js 15.1.3, App Router, React 19, TypeScript
- **Auth**: NextAuth v5 (`next-auth@5.0.0-beta.25`) with Discord OAuth, `@auth/prisma-adapter`
- **Database**: Prisma 5 + SQLite (`file:./dev.db`). WAL mode enabled at startup in `src/lib/prisma.ts`
- **UI**: shadcn/ui component system (Radix UI primitives + Tailwind CSS), dark mode only (`class="dark"` on `<html>`)
- **Toasts**: `sonner` — import `toast` from `"sonner"`, use `toast.success()`, `toast.error()`, `toast.info()`
- **Image processing**: `sharp` — lossless compression + metadata stripping, handled server-side in `src/lib/image-upload.ts`
- **Icons**: `lucide-react`
- **Validation**: `zod` in API routes

---

## Project structure

```
src/
├── app/
│   ├── actions.ts                    # Server actions: signInWithDiscord, signOutAction
│   ├── layout.tsx                    # Root layout — SidebarProvider, AppSidebar, AppShell, Toaster
│   ├── page.tsx                      # Login page (Discord OAuth sign-in)
│   ├── not-found.tsx                 # Global 404
│   ├── unauthorized/page.tsx         # 401 page with ?reason= param
│   │
│   ├── request/                      # Submit a new helmet request
│   │   ├── page.tsx                  # Server: checks open/closed, request lock, loads config
│   │   └── request-form.tsx          # Client: 3-step progress flow (validate → evidence → submit)
│   │
│   ├── armoury/
│   │   ├── me/                       # User's own helmets
│   │   │   ├── page.tsx              # Server: active + completed + declined
│   │   │   └── completed-table.tsx   # Client: clickable table rows → Sheet with image + download
│   │   ├── all/                      # Art team full archive
│   │   │   ├── page.tsx
│   │   │   └── armoury-table.tsx     # Client: no image in table, click row → Sheet side panel
│   │   └── add/                      # SAT+ direct-add helmet without a request
│   │       ├── page.tsx
│   │       └── direct-add-form.tsx
│   │
│   ├── requests/                     # Art team request management
│   │   ├── page.tsx                  # Overview board (Kanban: Submitted / Waiting / In Progress)
│   │   ├── overview-board.tsx        # Client: kanban + Sheet detail panel
│   │   ├── my/page.tsx               # Art team member's own active (IN_PROGRESS only)
│   │   ├── [id]/page.tsx             # Individual request detail
│   │   └── artist/[id]/              # Per-artist board with image upload + mark complete
│   │       ├── page.tsx
│   │       └── artist-board.tsx
│   │
│   ├── art-team/                     # Manage team membership and tiers
│   │   ├── page.tsx
│   │   └── art-team-manager.tsx      # Client: add/remove/change tier, force session invalidation
│   │
│   ├── config/                       # System config — settings, helmet types, decals, designs
│   │   ├── page.tsx
│   │   └── config-manager.tsx        # Client: tabbed, inline click-to-edit rows, search
│   │
│   ├── blacklist/
│   │   ├── page.tsx
│   │   └── blacklist-manager.tsx
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── requests/route.ts          # POST — submit request (rate limited, locked)
│       ├── requests/[id]/route.ts     # GET, PATCH — art team only for PATCH
│       ├── armoury/route.ts           # POST — SAT+ direct add
│       ├── upload/route.ts            # POST — image upload via sharp, saves to disk
│       ├── evidence/route.ts          # POST — sends to Discord webhook (?wait=true for message URL)
│       ├── config/route.ts            # POST — create config item
│       ├── config/[id]/route.ts       # PATCH, DELETE
│       ├── settings/route.ts          # GET, POST — system settings key/value store
│       ├── art-team/[id]/route.ts     # PATCH — tier/membership + force session invalidation
│       ├── blacklist/route.ts         # POST — blacklist + force sign-out
│       └── blacklist/[id]/route.ts    # DELETE — remove from blacklist
│
├── components/
│   ├── app-sidebar.tsx               # Collapsible desktop + mobile drawer sidebar
│   ├── app-shell.tsx                 # Client wrapper that adjusts margin for sidebar state
│   ├── sidebar-context.tsx           # Context: open/collapsed/isMobile state + localStorage persist
│   ├── status-tracker.tsx            # StatusTracker (progress dashes) + StatusBadge
│   ├── evidence-upload.tsx           # Drag-drop image + note → POST /api/evidence
│   ├── helmet-image-upload.tsx       # Drag-drop → POST /api/upload → R2/local, shows size stats
│   └── ui/                           # shadcn components (all hand-written, not npx shadcn add)
│       ├── avatar, badge, button, card, checkbox, command, dialog, dropdown-menu
│       ├── input, label, multi-combobox, popover, scroll-area, select, separator
│       ├── sheet, sonner, switch, table, tabs, textarea, tooltip
│
└── lib/
    ├── auth.ts                        # NextAuth config — Discord OAuth, role checks, session callbacks
    ├── discord-roles.ts               # Fetches roles from main + KMC guilds, determines tier/access
    ├── image-upload.ts                # sharp pipeline — strip metadata, lossless compress, save to disk
    ├── label-lookup.ts                # getItemLabelMap() + resolveLabels() — internal name → display label
    ├── prisma.ts                      # PrismaClient singleton + WAL mode init
    ├── rate-limit.ts                  # DB-backed rate limiting (survives restarts/cluster)
    └── utils.ts                       # cn(), REQUEST_STATUSES, STATUS_CONFIG, formatDate()
```

---

## Database schema summary

```prisma
User {
  isArtTeam        Boolean   // has any art team role
  artTeamTier      String?   // "head" | "senior" | "primary" | "reserve" | "sf" | null
  isBlacklisted    Boolean
  blacklistReason  String?
  discordRoles     String    // JSON array of Discord role ID strings, cached at sign-in
  kmcRoles         String    // JSON array of KMC server role IDs, cached at sign-in
}

Request {
  helmetType        String   // internal name e.g. "phase_2_arc_trooper"
  decals            String   // JSON array of internal names e.g. '["assault_class_decal"]'
  designs           String   // JSON array of internal names
  status            String   // "PENDING" | "ACCEPTED" | "DECLINED" | "IN_PROGRESS" | "COMPLETED"
  direct            Boolean  // true = art team added without a user request
  artistId          String?  // assigned art team member
  addedById         String?  // for direct adds
  requestedArtistId String?  // user preference, not binding
  evidenceUrl       String?  // Discord message link from /api/evidence
  evidenceNote      String?  // text note alongside evidence
  completedImageUrl String?  // served from /uploads/helmets/[uuid].[ext]
}

ConfigItem {
  category        String   // "helmetType" | "decal" | "design"
  subCategory     String?  // decal/design group e.g. "Class Decals", "Platoon Legacy — Ares"
  helmetCategory  String?  // helmet type group for combobox e.g. "Army", "Starfighter Corps"
  name            String   // internal slug e.g. "assault_class_decal"
  label           String   // display name e.g. "Assault Class Decal"
  requirement     String?  // full eligibility text shown in combobox dropdown
}

SystemSetting {
  key   String @id  // e.g. "requests_open", "requests_close_message"
  value String
}

RateLimit { userId, action, createdAt }  // DB-backed, use checkRateLimit() + recordRateLimit()
```

**Important:** `decals` and `designs` on Request are stored as JSON strings of **internal names**. Always use `getItemLabelMap()` + `resolveLabels()` from `src/lib/label-lookup.ts` to convert to display labels before rendering.

---

## Auth and roles

### Sign-in flow
1. Discord OAuth — scopes: `identify email guilds.members.read`
2. `src/lib/discord-roles.ts` → `checkDiscordRoles()` fetches both main guild and KMC guild roles
3. Determines `isArtTeam`, `artTeamTier`, `hasCustomHelmetAccess`, `isActiveMember`
4. Inactive members (no company or staff role) → redirected to `/unauthorized?reason=inactive`
5. Blacklisted users → sign-in blocked
6. Roles cached as JSON strings on `User.discordRoles` and `User.kmcRoles`

### Session fields
```ts
session.user = {
  id, name, email, image,
  isArtTeam: boolean,
  artTeamTier: "head" | "senior" | "primary" | "reserve" | "sf" | null,
  isBlacklisted: boolean,
  discordId: string,
  discordRoles: string[],   // cached Discord role IDs
  kmcRoles: string[],       // cached KMC role IDs
}
```

### Art team tiers and access
| Tier | Access |
|---|---|
| `head` | Everything — all SAT+ features |
| `senior` | Everything — all SAT+ features |
| `primary` | Everything — all SAT+ features |
| `reserve` | Art team pages, requests board, archive |
| `sf` | SF-specific art team access |

**SAT+** = `["head", "senior", "primary"]` — gates: direct-add helmets (`/armoury/add`), `DISCORD_CUSTOM_HELMET_ROLE_IDS` bypass

### Force session invalidation
When blacklisting or changing tier, always delete the user's sessions to force immediate re-login:
```ts
await prisma.session.deleteMany({ where: { userId: id } })
```

---

## Request pipeline

```
PENDING → ACCEPTED → IN_PROGRESS → COMPLETED
               ↘ DECLINED
```

**Constraints:**
- One open request at a time per user (status IN `["PENDING", "ACCEPTED", "IN_PROGRESS"]` with `direct: false`)
- Rate limited: 3 submissions per hour via `checkRateLimit(userId, "request:submit")`
- Requests open/closed controlled by `SystemSetting { key: "requests_open", value: "true"|"false" }`
- Custom close message: `SystemSetting { key: "requests_close_message", value: "..." }`

**Submit flow (client-side, `request-form.tsx`):**
1. Validate locally
2. POST evidence image to `/api/evidence` → Discord webhook → returns message URL
3. POST to `/api/requests` with all data including `evidenceUrl`
4. Redirect to `/armoury/me`

---

## Image uploads

**Local storage** via `src/lib/image-upload.ts`:
- `UPLOAD_DIR` env var — defaults to `<cwd>/public/uploads/helmets`
- `UPLOAD_PUBLIC_PREFIX` env var — defaults to `/uploads/helmets`
- `sharp` pipeline: strips all EXIF/XMP metadata, lossless compress (PNG lvl 9, WebP lossless, JPEG mozjpeg 95)
- UUID filename, original name discarded
- Returns `{ publicUrl, filename, originalSize, processedSize, width, height, summary }`

**API:** `POST /api/upload` — multipart form with `file` field, art team only

---

## Environment variables

```env
DATABASE_URL                         # file:./dev.db
AUTH_SECRET                          # openssl rand -base64 32
AUTH_DISCORD_ID                      # Discord app client ID
AUTH_DISCORD_SECRET                  # Discord app client secret
NEXTAUTH_URL                         # http://localhost:3000

DISCORD_GUILD_ID                     # Main 104th server ID
DISCORD_HEAD_ART_TEAM_ROLE_ID        # Role ID
DISCORD_SENIOR_ART_TEAM_ROLE_ID      # Role ID
DISCORD_PRIMARY_ART_TEAM_ROLE_ID     # Role ID
DISCORD_RESERVE_ART_TEAM_ROLE_ID     # Role ID
DISCORD_SF_ART_TEAM_ROLE_ID          # Role ID
DISCORD_CUSTOM_HELMET_ROLE_IDS       # Comma-separated role IDs for custom helmet toggle
DISCORD_COMPANY_ROLE_IDS             # Comma-separated — active member check
DISCORD_STAFF_ROLE_IDS               # Comma-separated — bypass company role check
DISCORD_EVIDENCE_WEBHOOK_URL         # Discord webhook URL for evidence submissions

KMC_GUILD_ID                         # KMC server ID for qual-specific decal checks

UPLOAD_DIR                           # Optional override e.g. /var/data/uploads/helmets
UPLOAD_PUBLIC_PREFIX                 # Optional override e.g. https://domain.com/uploads/helmets
```

---

## UI conventions

### Components to use
- All UI components are in `src/components/ui/` — use these, don't add new Radix primitives without adding the wrapper component too
- **Toasts**: `import { toast } from "sonner"` — `toast.success()`, `toast.error()`, `toast.info()`
- **Tables with detail**: Always make rows clickable → open a `Sheet` on the right (see `armoury-table.tsx` or `completed-table.tsx` for the pattern). Never put download buttons in table rows.
- **Display names**: Always resolve internal names to display labels using `getItemLabelMap()` + `resolveLabels()` from `src/lib/label-lookup.ts`. Never render raw internal names like `assault_class_decal` to users.
- **Multi-select dropdowns**: Use `MultiCombobox` from `src/components/ui/multi-combobox.tsx`
- **Grouped combobox**: Use Popover + Command with `CommandGroup` heading props (see `request-form.tsx`)

### Server vs client
- Pages are Server Components by default — fetch data in the page, pass serialised props to client components
- Dates must be serialised to `.toISOString()` before passing from server to client
- JSON fields (`decals`, `designs`, `discordRoles` etc.) must be `JSON.parse()`d server-side before passing
- Use `"use client"` only when needed (interactivity, state, browser APIs)
- Auth actions (`signIn`, `signOut`) live in `src/app/actions.ts` as `"use server"` named exports — do not inline them

### API routes
- Always check `await auth()` first
- Art team only: check `session.user.isArtTeam`
- SAT+ only: check `session.user.artTeamTier && ["head","senior","primary"].includes(session.user.artTeamTier)`
- Use Zod for input validation with `.safeParse()`
- Return consistent error shapes: `{ error: "message" }` with appropriate HTTP status

### Sidebar navigation
- User nav (everyone): New Request `/request`, My Armoury `/armoury/me`
- Art team nav (all tiers): Overview `/requests`, My Requests `/requests/my`, Full Archive `/armoury/all`, Art Team `/art-team`, Config `/config`, Blacklist `/blacklist`
- SAT+ only (head/senior/primary): Add Helmet `/armoury/add`
- Sidebar is collapsible desktop (persisted to localStorage), full-width drawer on mobile (< 768px)

---

## Config system

`ConfigItem` records drive what appears in the request form dropdowns. The seed file (`prisma/seed.ts`) populates all 130+ decals and designs from the 104th's official lists.

**Categories:**
- `helmetType` — grouped by `helmetCategory` (e.g. "Army", "Starfighter Corps") in the combobox
- `decal` — grouped by `subCategory` (e.g. "Class Decals", "Instructor Decals", "Starfighter Decals", "104th Insignias", "Art Team Decals")
- `design` — grouped by `subCategory` (e.g. "Join Date", "Raid Rewards", "Service Rewards", "Platoon Legacy — Ares", "Wing Legacy", "Class Mastery", etc.)

**Config page tabs:** Settings | Helmet Types | Class Decals | Instructor | Starfighter | Insignias | Art Team | Trooper | Mastery | Platoon | Wing

Inline editing: click the pencil icon on a row to edit label/requirement/helmetCategory in place, check to save, X to cancel.

---

## Production deployment

```bash
npm run build
pm2 start ecosystem.config.js   # cluster mode, uses all CPU cores
```

**Nginx** sits in front as reverse proxy — handles SSL termination, serves `/uploads/` directly from disk (bypasses Node entirely), enables gzip.

**Cloudflare** free tier in front of Nginx — caches `/uploads/*` and `/_next/static/*` at edge, absorbs ~80% of requests before they hit the VPS.

**Recommended VPS:** GalaxyGate Standard 2G ($5/month) — 2GB RAM, 20GB NVMe, unmetered bandwidth. Enough for this app with the caching stack in place.

```bash
# After any schema change:
npx prisma generate
npx prisma db push

# Always restart the built app, never run dev in production:
npm run build && pm2 reload helmet-armoury
```

---

## Known patterns to follow

**Adding a new art-team-only page:**
1. Create `src/app/yourpage/page.tsx` as a Server Component
2. Add `if (!session?.user?.isArtTeam) redirect("/armoury/me")` at the top
3. Add the route to `artNavBase` in `src/components/app-sidebar.tsx`

**Adding a new SAT+-only page:**
1. Same as above but check `const allowedTiers = ["head","senior","primary"]; if (!allowedTiers.includes(session.user.artTeamTier ?? "")) redirect(...)`
2. Add to `satNav` in `app-sidebar.tsx`

**Adding a new API route:**
1. Always validate auth first
2. Wrap any `SystemSetting` or `RateLimit` queries in try/catch — these models may not exist if `prisma generate` hasn't been run
3. Return `{ ...record, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt?.toISOString() }` to avoid serialisation errors

**Adding a new SystemSetting key:**
1. Use it defensively: `const setting = await (prisma as any).systemSetting.findUnique(...)` wrapped in try/catch until `generate` + `db push` has been run
2. Document the key in `.env.example` comments and in this file

---

## Common gotchas

- **`prisma.systemSetting` is undefined** → run `npx prisma generate && npx prisma db push`
- **"headers called outside request scope"** → signIn/signOut must be in `src/app/actions.ts` as named server actions, not inlined in components
- **Slow dev server** → always use `npm run build && npm start` in production, never `npm run dev`
- **Images 404** → check `UPLOAD_DIR` doesn't already include `/helmets` (the lib appends nothing — it writes directly to `UPLOAD_DIR`)
- **Session not updating after role change** → the session callback re-checks blacklist on every request; tier changes require the user to sign out and back in (or call `prisma.session.deleteMany` to force it)
