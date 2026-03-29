# 104th Art Team — Helmet Armoury

Full-stack Next.js 15 app for managing custom helmet (Discord PFP) requests for the 104th Battalion Art Team.

---

## Stack

- **Framework**: Next.js 15 (App Router, Server Components)
- **Auth**: NextAuth v5 — Discord OAuth with role-based art team detection
- **Database**: Prisma + SQLite (swap to PostgreSQL for production)
- **Storage**: Local filesystem — completed helmet images stored in `public/uploads/helmets/`
- **Image processing**: [sharp](https://sharp.pixelplumbing.com/) — strips all EXIF/XMP metadata, losslessly compresses PNG/WebP/JPEG before saving
- **Notifications**: Discord Webhook — evidence screenshots sent to a dedicated channel
- **UI**: Tailwind CSS + shadcn/ui component system (Radix UI primitives)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | `file:./dev.db` for local SQLite |
| `AUTH_SECRET` | ✓ | Run `openssl rand -base64 32` |
| `AUTH_DISCORD_ID` | ✓ | Discord app Client ID |
| `AUTH_DISCORD_SECRET` | ✓ | Discord app Client Secret |
| `DISCORD_GUILD_ID` | ✓ | Your server/guild ID |
| `DISCORD_ART_TEAM_ROLE_ID` | ✓ | Role ID for Art Team members |
| `DISCORD_EVIDENCE_WEBHOOK_URL` | ✓ | Webhook URL for evidence submissions |
| `UPLOAD_DIR` | — | Override upload directory (default: `public/uploads`) |
| `UPLOAD_PUBLIC_PREFIX` | — | Override public URL prefix (default: `/uploads/helmets`) |

### 3. Discord OAuth setup

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) → New Application
2. Under **OAuth2 → Redirects** add `http://localhost:3000/api/auth/callback/discord`
3. Scopes needed: `identify email guilds.members.read`
4. Copy Client ID and Secret into `.env`

### 4. Evidence webhook

1. In your Discord server: right-click a channel → **Edit Channel → Integrations → Webhooks → New Webhook**
2. Copy the webhook URL into `DISCORD_EVIDENCE_WEBHOOK_URL`

### 5. Initialise and seed the database

```bash
npm run db:push    # creates dev.db and applies schema
npm run db:seed    # seeds all 130+ decals/designs from the 104th CSV data
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Image storage

Completed helmet images are stored locally in `public/uploads/helmets/` and served as static files. Each image is processed before saving:

- **Metadata stripped** — all EXIF, XMP, ICC and GPS data removed
- **Losslessly compressed** — PNG at max zlib level 9, WebP lossless, JPEG at quality 95 via mozjpeg
- **Filename** — UUID-based, no original filename retained

The upload directory is configurable for VPS deployments where you may want uploads outside the web root:

```env
UPLOAD_DIR=/var/data/helmets/uploads
UPLOAD_PUBLIC_PREFIX=https://your-domain.com/uploads/helmets
```

If `UPLOAD_DIR` points outside `public/`, you will need to serve the directory via nginx/caddy separately.

### Backup recommendation

For long-term archiving, back up the `public/uploads/helmets/` directory (or your custom `UPLOAD_DIR`) alongside the database. A simple cron job works well:

```bash
# Daily backup example
tar -czf /backups/helmets-$(date +%Y%m%d).tar.gz /path/to/public/uploads/helmets/
sqlite3 /path/to/dev.db ".backup '/backups/db-$(date +%Y%m%d).db'"
```

---

## Pages

| Route | Access | Description |
|---|---|---|
| `/` | Public | Discord sign-in |
| `/request` | Members | Submit request — helmet combobox, grouped decal/design multi-comboboxes, evidence upload to Discord |
| `/armoury/me` | Members | Personal archive with status tracker and download |
| `/armoury/all` | Art Team | Full searchable/filterable table of all helmets |
| `/requests` | Art Team | Kanban overview with click-to-open detail sheet |
| `/requests/artist/[id]` | Art Team | Per-artist queue with image upload and mark-complete |
| `/config` | Art Team | Tabbed config for all helmet types, decal and design groups |
| `/blacklist` | Art Team | Manage blacklisted users |

---

## Production deployment

1. Change `prisma/schema.prisma` provider from `sqlite` → `postgresql`
2. Set `DATABASE_URL` to a PostgreSQL connection string
3. Set `NEXTAUTH_URL` to your production domain
4. Add the production callback URL to Discord OAuth2 redirects
5. Ensure `public/uploads/helmets/` is on a persistent volume (not ephemeral)
6. Deploy with `npm run build && npm start`
