import { prisma } from "./prisma"

// DB-backed rate limiting — survives server restarts and works across PM2 cluster workers

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "request:submit": { max: 3, windowMs: 60 * 60 * 1000 },   // 3 requests per hour
  "evidence:upload": { max: 10, windowMs: 60 * 60 * 1000 },  // 10 uploads per hour
  "api:general": { max: 60, windowMs: 60 * 1000 },            // 60 general API calls per minute
}

export async function checkRateLimit(
  userId: string,
  action: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const limit = LIMITS[action] ?? LIMITS["api:general"]
  const windowStart = new Date(Date.now() - limit.windowMs)

  // Clean up old entries while we're at it
  await (prisma as any).rateLimit.deleteMany({
    where: { userId, action, createdAt: { lt: windowStart } },
  }).catch(() => {})

  const count = await (prisma as any).rateLimit.count({
    where: { userId, action, createdAt: { gte: windowStart } },
  }).catch(() => 0)

  const allowed = count < limit.max
  const resetAt = new Date(Date.now() + limit.windowMs)

  return { allowed, remaining: Math.max(0, limit.max - count - 1), resetAt }
}

export async function recordRateLimit(userId: string, action: string) {
  await (prisma as any).rateLimit.create({
    data: { userId, action },
  }).catch(() => {})
}
