/**
 * Migrate data from a SQLite database (prod.db) to PostgreSQL.
 *
 * Prerequisites (run once on the VPS before executing this script):
 *   npm install --save-dev better-sqlite3
 *
 * Usage:
 *   DATABASE_URL="postgresql://helmet_user:changeme@localhost:5432/helmet_armoury" \
 *     node scripts/migrate-sqlite-to-postgres.js /path/to/prod.db
 *
 * The PostgreSQL database must already exist and have the schema applied:
 *   npx prisma db push
 *
 * What is migrated:
 *   User, Account, HelmetCategory, ArtTeamClearance, ConfigItem,
 *   SystemSetting, Request, PushSubscription
 *
 * What is intentionally skipped:
 *   Session  — users will re-authenticate after migration
 *   RateLimit — stale data, not worth carrying over
 */

const Database = require("better-sqlite3")
const { PrismaClient } = require("@prisma/client")
const path = require("path")

const sqlitePath = process.argv[2] || require("os").homedir() + "/helmet-armoury/prisma/prod.db"
console.log(`SQLite source: ${require("path").resolve(sqlitePath)}`)

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith("postgresql")) {
  console.error("DATABASE_URL must be set to a PostgreSQL connection string")
  process.exit(1)
}

const sqlite = new Database(path.resolve(sqlitePath), { readonly: true })
const prisma = new PrismaClient()

function all(table) {
  return sqlite.prepare(`SELECT * FROM "${table}"`).all()
}

function count(table) {
  return sqlite.prepare(`SELECT count(*) as n FROM "${table}"`).get().n
}

async function migrate() {
  console.log(`\nReading from: ${path.resolve(sqlitePath)}`)
  console.log(`Writing to:   ${process.env.DATABASE_URL}\n`)

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = all("User")
  console.log(`Migrating ${users.length} users...`)
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id:                u.id,
        name:              u.name,
        email:             u.email,
        emailVerified:     u.emailVerified ? new Date(u.emailVerified) : null,
        image:             u.image,
        discordId:         u.discordId,
        discordName:       u.discordName,
        serverDisplayName: u.serverDisplayName,
        isArtTeam:         Boolean(u.isArtTeam),
        artTeamTier:       u.artTeamTier,
        isBlacklisted:     Boolean(u.isBlacklisted),
        blacklistReason:   u.blacklistReason,
        armouryOnly:       Boolean(u.armouryOnly),
        discordRoles:      u.discordRoles ?? "[]",
        kmcRoles:          u.kmcRoles ?? "[]",
        clearances:        u.clearances ?? "[]",
        createdAt:         u.createdAt ? new Date(u.createdAt) : new Date(),
      },
    })
  }
  console.log(`  ✓ ${users.length} users`)

  // ── Accounts ───────────────────────────────────────────────────────────────
  const accounts = all("Account")
  console.log(`Migrating ${accounts.length} accounts...`)
  for (const a of accounts) {
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: a.provider, providerAccountId: a.providerAccountId } },
      update: {},
      create: {
        id:                a.id,
        userId:            a.userId,
        type:              a.type,
        provider:          a.provider,
        providerAccountId: a.providerAccountId,
        refresh_token:     a.refresh_token,
        access_token:      a.access_token,
        expires_at:        a.expires_at,
        token_type:        a.token_type,
        scope:             a.scope,
        id_token:          a.id_token,
        session_state:     a.session_state,
      },
    })
  }
  console.log(`  ✓ ${accounts.length} accounts`)

  // ── HelmetCategories ───────────────────────────────────────────────────────
  let helmetCategories = []
  try {
    helmetCategories = all("HelmetCategory")
    console.log(`Migrating ${helmetCategories.length} helmet categories...`)
    for (const h of helmetCategories) {
      await prisma.helmetCategory.upsert({
        where: { id: h.id },
        update: {},
        create: {
          id:        h.id,
          name:      h.name,
          sortOrder: h.sortOrder ?? 0,
          clearance: h.clearance,
          createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
        },
      })
    }
    console.log(`  ✓ ${helmetCategories.length} helmet categories`)
  } catch { console.log("  ⚠ HelmetCategory table not found — skipping") }

  // ── ArtTeamClearances ──────────────────────────────────────────────────────
  let clearances = []
  try {
    clearances = all("ArtTeamClearance")
    console.log(`Migrating ${clearances.length} art team clearances...`)
    for (const c of clearances) {
      await prisma.artTeamClearance.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id:          c.id,
          name:        c.name,
          label:       c.label,
          description: c.description,
          memberIds:   c.memberIds ?? "[]",
          createdAt:   c.createdAt ? new Date(c.createdAt) : new Date(),
          updatedAt:   c.updatedAt ? new Date(c.updatedAt) : new Date(),
        },
      })
    }
    console.log(`  ✓ ${clearances.length} clearances`)
  } catch { console.log("  ⚠ ArtTeamClearance table not found — skipping") }

  // ── ConfigItems ────────────────────────────────────────────────────────────
  const configItems = all("ConfigItem")
  console.log(`Migrating ${configItems.length} config items...`)
  for (const c of configItems) {
    await prisma.configItem.upsert({
      where: { category_name: { category: c.category, name: c.name } },
      update: {},
      create: {
        id:             c.id,
        category:       c.category,
        subCategory:    c.subCategory,
        helmetCategory: c.helmetCategory,
        name:           c.name,
        label:          c.label,
        requirement:    c.requirement,
        rankReq:        c.rankReq,
        note:           c.note,
        active:         Boolean(c.active ?? 1),
        standard:       Boolean(c.standard ?? 1),
        slotWeight:     c.slotWeight ?? 1,
        sortOrder:      c.sortOrder ?? 0,
        allowedRoleIds: c.allowedRoleIds ?? "[]",
        createdAt:      c.createdAt ? new Date(c.createdAt) : new Date(),
      },
    })
  }
  console.log(`  ✓ ${configItems.length} config items`)

  // ── SystemSettings ─────────────────────────────────────────────────────────
  let settings = []
  try {
    settings = all("SystemSetting")
    console.log(`Migrating ${settings.length} system settings...`)
    for (const s of settings) {
      await prisma.systemSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: {
          key:       s.key,
          value:     s.value,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        },
      })
    }
    console.log(`  ✓ ${settings.length} system settings`)
  } catch { console.log("  ⚠ SystemSetting table not found — skipping") }

  // ── Requests ───────────────────────────────────────────────────────────────
  const requests = all("Request")
  console.log(`Migrating ${requests.length} requests...`)
  for (const r of requests) {
    await prisma.request.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id:                r.id,
        userId:            r.userId,
        helmetType:        r.helmetType,
        decals:            r.decals ?? "[]",
        designs:           r.designs ?? "[]",
        visorColour:       r.visorColour,
        attachments:       r.attachments ?? "[]",
        battleDamage:      Boolean(r.battleDamage),
        custom:            Boolean(r.custom),
        customDetails:     r.customDetails,
        evidenceUrl:       r.evidenceUrl,
        evidenceNote:      r.evidenceNote,
        status:            r.status ?? "PENDING",
        direct:            Boolean(r.direct),
        artistId:          r.artistId,
        addedById:         r.addedById,
        completedImageUrl: r.completedImageUrl,
        internalNotes:     r.internalNotes,
        requestedArtistId: r.requestedArtistId,
        declineReason:     r.declineReason,
        completedAt:       r.completedAt ? new Date(r.completedAt) : null,
        cooldownType:      r.cooldownType,
        createdAt:         r.createdAt ? new Date(r.createdAt) : new Date(),
        updatedAt:         r.updatedAt ? new Date(r.updatedAt) : new Date(),
      },
    })
  }
  console.log(`  ✓ ${requests.length} requests`)

  // ── PushSubscriptions ──────────────────────────────────────────────────────
  let pushSubs = []
  try {
    pushSubs = all("PushSubscription")
    console.log(`Migrating ${pushSubs.length} push subscriptions...`)
    for (const p of pushSubs) {
      await prisma.pushSubscription.upsert({
        where: { endpoint: p.endpoint },
        update: {},
        create: {
          id:        p.id,
          userId:    p.userId,
          endpoint:  p.endpoint,
          p256dh:    p.p256dh,
          auth:      p.auth,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        },
      })
    }
    console.log(`  ✓ ${pushSubs.length} push subscriptions`)
  } catch { console.log("  ⚠ PushSubscription table not found — skipping") }

  console.log("\n✅ Migration complete\n")
}

migrate()
  .catch((err) => {
    console.error("\n❌ Migration failed:", err)
    process.exit(1)
  })
  .finally(() => {
    sqlite.close()
    prisma.$disconnect()
  })
