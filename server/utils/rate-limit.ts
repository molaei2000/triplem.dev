import type { H3Event } from "h3";

interface Bucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window, in-memory rate limit. Enough for a single Node process; a
 * multi-instance deploy would move this to shared storage (Redis, KV).
 * Throws 429 with `Retry-After` when `key` is over `limit` in `windowMs`.
 */
export function enforceRateLimit(event: H3Event, key: string, limit: number, windowMs: number) {
    const now = Date.now();
    if (buckets.size > 5000) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
    }
    bucket.count++;

    if (bucket.count > limit) {
        setResponseHeader(event, "Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
        throw createError({ statusCode: 429, statusMessage: "Too many messages. Try again later." });
    }
}

/**
 * Client IP. Behind Nginx, set `proxy_set_header X-Real-IP $remote_addr;` so
 * this reads the real address (the header is only trustworthy when the proxy
 * overwrites it, which is why X-Forwarded-For isn't used).
 */
export function clientIp(event: H3Event) {
    return getHeader(event, "x-real-ip") || getRequestIP(event) || "unknown";
}
