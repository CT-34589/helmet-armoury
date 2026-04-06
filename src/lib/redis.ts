import Redis from "ioredis"

const url = process.env.REDIS_URL

// Two separate connections are required — a subscribed client cannot issue
// other commands (Redis protocol restriction).
export const redisPub: Redis | null = url ? new Redis(url) : null
export const redisSub: Redis | null = url ? new Redis(url) : null