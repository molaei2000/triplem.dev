---
title: "Next.js November 2026 security release: seven advisories, four of them in use cache"
description: "Next.js 16.4.5 and 15.5.29 fix seven advisories. Four hit use cache and Cache Components; here is who is exposed, what the conditions are and how to check."
date: 2026-11-04
cover: /images/blog/2026-11-04-nextjs-november-2026-security-release.svg
tags: [next.js, security, caching]
draft: false
---

The scheduled November release for Next.js [shipped on 3 November](https://nextjs.org/blog/november-2026-security-release) as v16.4.5 (Active LTS) and v15.5.29 (Maintenance LTS). It had been [announced a week earlier](https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026). It covers seven advisories, and the theme is clear: four of them are about cache identity in `use cache` and Cache Components. If you adopted Cache Components after 16.4 made it the recommendation, this one is for you.

```bash
npm install next@16.4.5   # 16.x line
npm install next@15.5.29  # 15.5 line
```

The [v16.4.5 release notes](https://github.com/vercel/next.js/releases/tag/v16.4.5) list all seven. The 15.5.29 notes list three of them: the response injection, the SVG bypass and the Edge cookie exposure. That fits the conditions below, since the cache issues need `use cache`.

## The four cache advisories

All four share a shape: two requests that should have different cache entries end up sharing one. None of them lets an attacker read arbitrary entries; each reuses content your application itself generated.

**1. `unstable_cache` plus `use cache` ([GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h)).** Needs Cache Components enabled, a public `use cache` function that reads a root parameter (the post's example is a tenant identifier), and that same function called both directly and from inside `unstable_cache`. On a cold fill, a concurrent call through `unstable_cache` can receive another request's result without a root-parameter check, and the result is then stored and served to later callers with the same arguments until revalidation or eviction.

```ts
// The risky combination, in outline
import { unstable_cache } from "next/cache";

async function getPrices(plan: string) {
    "use cache";
    const tenant = await tenantFromRootParams(); // reads a root param
    return db.prices.find({ tenant, plan });
}

// called directly in one place...
const direct = await getPrices("pro");
// ...and wrapped in unstable_cache in another
const wrapped = await unstable_cache(() => getPrices("pro"), ["prices"])();
```

`tenantFromRootParams` is a placeholder of mine, not a Next.js API. The pattern to search for is the mixture itself. If you are mid-migration from `unstable_cache` to `use cache`, this is exactly the state you are in.

**2. Nested `use cache` ([GHSA-vc7v-qv4w-wrv8](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8)).** An inner cached function reads a root parameter and returns an early value together with a slower async value, while the outer function finishes without awaiting the slow part. The outer entry can be stored before the inner function's root-parameter dependencies are recorded, so tenant-, site- or locale-specific content can cross the routing boundary.

**3. Binary arguments ([GHSA-rhh4-g77r-r9qj](https://github.com/vercel/next.js/security/advisories/GHSA-rhh4-g77r-r9qj)).** Different binary arguments to a `use cache` function can produce the same cache identity. If those arguments distinguish users or accounts and everything else in the identity matches, one caller can get another's cached result or plant theirs.

**4. Shared shell poisoning (no GHSA link in the post).** Affects self-hosted `next start` with Cache Components on and Partial Prefetching disabled or unset. A crafted URL can put request-specific values into a shell used by other URLs, giving wrong server-rendered content or persistent 404s. The route shape is narrow: a prerenderable dynamic parameter requested with a value not generated at build time, at least two deeper parameters never prerendered, a blocking fallback shell, and a layout reading the shallower deeper parameter inside Suspense. Build-generated values and Partial Prefetching configurations were not affected in the reported tests.

## The other three

- **Response framing ([GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385)).** Self-hosted apps that return an attacker-controlled fetched `Response` unchanged can forward decompressed bytes with the original compressed framing headers. Behind an HTTP/1.1 reverse proxy that queues pipelined requests on a shared backend connection, responses can be assigned to the wrong clients. The post stresses this does not apply to every proxy setup.
- **Edge cookies ([GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2)).** App Router Edge Route Handlers and Pages Router Edge API routes that call `NextResponse.cookies.set()` can expose the serialized cookie in the internal `x-middleware-set-cookie` header, which same-origin JavaScript can read even for `HttpOnly` cookies. It needs a sensitive cookie plus attacker-controlled script on your origin. Node.js Route Handlers and `cookies().set()` were not affected in the reproduction.
- **SVG bypass in image optimization ([GHSA-7qx7-33qx-rqx2](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2)).** An image from a permitted source can be misclassified as AVIF and slip past `images.dangerouslyAllowSVG: false`, then be decoded as SVG by a native backend that supports it. The source allowlist still applies, and the post says it does not demonstrate XSS or RCE on its own; it widens exposure to SVG parser resource exhaustion and decoder bugs.

## A severity discrepancy

The blog post labels the first advisory High and the rest Medium. The GitHub release notes put all seven under a Moderate heading. I can't tell from the pages I read which one reflects the advisory records, so check each GHSA page. Also, the post's install snippet comments the 16.4.5 line as "for 16.5"; the version number in the command is what counts.

## How to triage

1. **Find `use cache` usage.** `grep -rn "use cache" app` plus any `unstable_cache` import. No Cache Components, no cache advisories.
2. **Look for root parameters read inside cached functions**, especially tenant, site or locale. These are the data that would leak.
3. **Look for binary arguments** (`Buffer`, `Uint8Array`, `ArrayBuffer`) passed to cached functions that scope by user.
4. **Self-hosters:** check whether you return fetched `Response` objects directly from handlers, and what sits between you and the client. Check Partial Prefetching and your route shapes against the shell advisory.
5. **Edge routes:** grep for `NextResponse.cookies.set` in routes with `runtime = "edge"`. Switch sensitive ones to Node.js after patching if you want less surface, and treat already-exposed session cookies as rotatable.
6. **Image config:** if you use a permissive `remotePatterns`, patching is more urgent than the post's tone suggests.

## Trade-offs and caveats

- Cache entries filled before the upgrade may still hold wrongly shared content. For the first advisory, the post says a wrongly stored result is served until it is revalidated or evicted, so after patching, consider invalidating cached tenant-scoped data. Whether a deploy clears your cache depends on your cache handler, which I did not verify.
- Tenant-scoped data is a poor fit for any shared cache keyed implicitly. Even patched, put the tenant in the function's arguments where you can, so the identity is visible in code review.
- The Next.js blog index lists security releases or updates on September 22, September 30, October 14 and now November 3. A routine release lane helps, but patch cadence is now part of operating this framework.
- I only read the release notes and the blog post, not the individual GHSA pages, so affected version ranges beyond what is stated above are not covered here.

## Sources

- [November 2026 Security Release](https://nextjs.org/blog/november-2026-security-release)
- [Next.js blog index](https://nextjs.org/blog)
- [Next.js v16.4.5 release notes](https://github.com/vercel/next.js/releases/tag/v16.4.5)
- [Next.js releases list](https://github.com/vercel/next.js/releases)
