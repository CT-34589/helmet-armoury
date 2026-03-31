import { NextRequest, NextResponse } from "next/server"

// In-memory rate limit: max 5 Discord OAuth attempts per IP per minute.
// Per-worker under pm2 cluster — acceptable for burst prevention.
const authAttempts = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW = 60_000 // 1 minute

function getIp(req: NextRequest): string | null {
  // Prefer Cloudflare's header, then Nginx's X-Real-IP, then X-Forwarded-For
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    null
  )
}

export function proxy(req: NextRequest) {
  const ip = getIp(req)

  // Skip for localhost / internal requests
  if (!ip || ip === "::1" || ip.startsWith("127.")) {
    return NextResponse.next()
  }

  const now = Date.now()
  const entry = authAttempts.get(ip)

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) {
      return NextResponse.redirect(new URL("/unauthorized?reason=ratelimited", req.url))
    }
    entry.count++
  } else {
    authAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/auth/callback/discord"],
}