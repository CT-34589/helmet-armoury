import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Enable WAL mode and security pragmas on first use
// WAL allows concurrent reads during writes, greatly reducing lock contention
async function initDb() {
  try {
    // SQLite PRAGMAs return rows; $executeRaw* rejects those. Use queryRaw for PRAGMA.
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;")
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL;")
    await prisma.$queryRawUnsafe("PRAGMA cache_size=1000000;")
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;")
    // Checkpoint WAL every hour to prevent unbounded growth
    setInterval(() => {
      prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);").catch(() => {})
    }, 1000 * 60 * 60)
  } catch {
    // Non-fatal — WAL mode is an optimisation not a requirement
  }
}

if (typeof window === "undefined") {
  initDb()
}
