# PM2 Clustering — Cross-Worker Cache Problem

## The problem

PM2 cluster mode spawns one Node.js worker per CPU core. Each worker is an isolated process with its own memory. This caused stale data bugs with Next.js's `unstable_cache`:

`revalidateTag("config")` only clears the cache in the **single worker that handled the API request**. All other workers keep serving stale data until their 24h TTL expires.

**Symptoms observed:**
- Config items (decals, designs, attachments) added or removed in `/config` still appeared in the request form after a page reload, because the next request hit a different worker with stale cache.
- Role permissions set on config items reverted on refresh for the same reason.

## The fix applied

Rather than adding Redis infrastructure, all pages that serve mutable config data were changed to **query Prisma directly** instead of using `unstable_cache`. Direct DB queries are always fresh regardless of which worker handles the request.

Pages changed:
- `src/app/request/page.tsx` — config items and helmet categories
- `src/app/armoury/add/page.tsx` — config items and helmet categories
- `src/app/config/page.tsx` — config items and helmet categories (done earlier)

`getArtTeamMembers()` is still cached — it's used only for the preferred-artist picker in the request form, staleness there is not user-facing critical, and it changes infrequently.

The cached query functions in `src/lib/cached-queries.ts` now only serve as a convenience for data that genuinely doesn't need to be fresh (art team members). The `getActiveConfigItems`, `getAllConfigItems`, and `getHelmetCategories` exports remain in the file but are no longer called anywhere — they can be removed if desired.

## SSE bus across workers (not a problem — noted for reference)

The SSE bus (`src/lib/sse-bus.ts`) uses module-level subscriber state (Map/Set). Each worker has its own subscriber pool. This is **not a problem** because the bus uses DB polling (every 2s) rather than event broadcasting — a change written by worker A is detected by all workers on their next tick independently.

## If direct Prisma queries become a performance concern

If SQLite read latency becomes measurable (unlikely at this scale), the proper solution is a **shared Redis cache handler**:

1. Install Redis: `sudo apt install redis-server` (idle ~5MB RAM)
2. Install adapter: `npm install @neshca/cache-handler ioredis`
3. Create `cache-handler.js` using the `@neshca/cache-handler` Redis adapter
4. Add to `next.config.js`:
   ```js
   experimental: {
     cacheHandler: require.resolve('./cache-handler.js'),
     cacheMaxMemorySize: 0,
   }
   ```

With Redis, `revalidateTag` writes invalidation to a shared store and all workers read from it — so caching works correctly across the cluster and pages can go back to using `unstable_cache`.

Reference: https://nextjs.org/docs/app/api-reference/next-config-js/cacheHandler
