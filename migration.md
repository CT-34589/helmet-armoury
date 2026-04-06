# SQLite → PostgreSQL + Redis Migration

## What changes and why

| Before | After | Why |
|---|---|---|
| SQLite (WAL mode) | PostgreSQL | True concurrent writes — no SQLITE_BUSY under load |
| In-process SSE bus | SSE bus + Redis pub/sub | Cross-worker event propagation — all PM2 workers push instantly |
| PM2 cluster (all CPUs) | PM2 cluster (all CPUs) | Now safe — PostgreSQL handles concurrent workers correctly |

---

## Prerequisites

Install PostgreSQL and Redis on the server:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib redis-server

# Enable + start
sudo systemctl enable postgresql redis-server
sudo systemctl start postgresql redis-server
```

---

## 1. Create the PostgreSQL database

```bash
sudo -u postgres psql <<SQL
CREATE USER helmet_user WITH PASSWORD 'changeme';
CREATE DATABASE helmet_armoury OWNER helmet_user;
GRANT ALL PRIVILEGES ON DATABASE helmet_armoury TO helmet_user;
SQL
```

---

## 2. Update environment variables

Add/update these in your `.env` (and in `ecosystem.config.js` env block for production):

```env
# Replace the SQLite URL
DATABASE_URL="postgresql://helmet_user:changeme@localhost:5432/helmet_armoury?connection_limit=5"

# Redis (default local instance needs no auth)
REDIS_URL="redis://localhost:6379"
```

`connection_limit=5` means each PM2 worker holds max 5 DB connections. With 4 workers that's 20 total — well within PostgreSQL's default of 100.

---

## 3. Migrate the schema

```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Push schema to the new database (first time — no existing migrations)
npx prisma db push

# Verify tables were created
npx prisma studio
```

---

## 4. Migrate existing data from SQLite

Install the SQLite reader (only needed for this script, can be removed after):

```bash
npm install --save-dev better-sqlite3
```

Run the migration script, pointing it at your production SQLite file:

```bash
DATABASE_URL="postgresql://helmet_user:changeme@localhost:5432/helmet_armoury" \
  node scripts/migrate-sqlite-to-postgres.js ~/helmet-armoury/prisma/prod.db
```

The script migrates: Users, Accounts, HelmetCategories, ArtTeamClearances, ConfigItems, SystemSettings, Requests, PushSubscriptions.

Skips: Sessions (users will re-login), RateLimits (stale, not worth carrying over).

It uses `upsert` throughout so it is safe to re-run if it fails partway through.

---

## 5. Install new dependencies

```bash
npm install
```

(`ioredis` was added to `package.json` — this installs it.)

---

## 6. Build and deploy

```bash
npm run build
pm2 reload helmet-armoury
```

---

## 7. Verify

```bash
# Check Redis is receiving events — open two terminals:
# Terminal 1: monitor Redis
redis-cli monitor

# Terminal 2: trigger a request status change via the app
# You should see PUBLISH commands appear in terminal 1

# Check PostgreSQL connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'helmet_armoury';"

# PM2 status
pm2 status
pm2 logs helmet-armoury --lines 50
```

---

## Rollback

If something goes wrong:

1. Revert `prisma/schema.prisma` provider back to `sqlite`
2. Revert `DATABASE_URL` to `file:./dev.db`
3. Remove `REDIS_URL`
4. `npm run build && pm2 reload helmet-armoury`

The SQLite database file is untouched by this migration.

---

## Redis security note

By default Redis binds to `127.0.0.1` only (no external access). Verify:

```bash
grep "^bind" /etc/redis/redis.conf
# Should show: bind 127.0.0.1 -::1
```

If you ever expose Redis externally, set a password via `requirepass` in `redis.conf`.