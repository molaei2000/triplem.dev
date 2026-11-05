---
title: "Next.js 16.4.5: four of seven advisories are about use cache, so audit your cache keys"
description: "Next.js 16.4.5 and 15.5.29 ship moderate security fixes: use cache leaks across root params, poisoned fallback shells, Edge cookie exposure. What to check first."
date: 2026-11-05
cover: /images/blog/2026-11-05-nextjs-16-4-5-use-cache-advisories.svg
tags: [next.js, security, caching]
draft: false
---

Two days after the [Nuxt 4.6.4 security release](/blog/2026-11-03-nuxt-4-6-4-security), Next.js did the same. On November 3 the team published [v16.4.5](https://github.com/vercel/next.js/releases/tag/v16.4.5) with seven advisories, all rated Moderate, and [v15.5.29](https://github.com/vercel/next.js/releases/tag/v15.5.29) with three of them. A day earlier, [v16.4.4](https://github.com/vercel/next.js/releases/tag/v16.4.4) was a regular backport release.

```bash
npm install next@16.4.5   # 16.x line
npm install next@15.5.29  # 15.x line
```

One caveat on sourcing: the release notes only list advisory titles. The advisory pages I could read describe affected ranges and conditions, but did not list patched versions, so treat "upgrade to the latest patch in your line" as the release pages' implied fix and confirm in the advisory UI.

## The pattern: four advisories about cache identity

Four of the seven titles concern `'use cache'` and Cache Components. The common thread is that a cache entry gets stored or served under a key that is narrower or wider than the data it holds.

| Advisory | Title (abridged) |
| --- | --- |
| GHSA-mfr8-8qww-v76h | Cross-tenant disclosure in `'use cache'` called through `unstable_cache` |
| GHSA-vc7v-qv4w-wrv8 | Cache leak across root param values in nested `'use cache'` functions (follow-up) |
| GHSA-vvgp-ww4w-46vf | Cache poisoning of shared fallback shells via request-supplied placeholder route params |
| GHSA-rhh4-g77r-r9qj | Cross-user disclosure and poisoning in `use cache` with binary arguments |

I only fetched the first and third advisory pages, so the details below cover those two; for the other two, I'm relying on the titles from the release notes.

### Root params leaking through `unstable_cache`

[GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) (CVSS 4.0 6.3, affects 16.3.0 and later) needs a specific shape: the same `'use cache'` function is called directly during render and also through `unstable_cache()`, and it reads a root param such as a locale. If an `unstable_cache()` call arrives while the first fill after process start is still running, a cross-request deduplication race can hand it data cached for a different root param value. The result is then stored under a key without root params, so other requests keep receiving it until revalidation or eviction.

The pattern looks like this:

```ts
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

async function getPrices() {
    "use cache";
    // reads a root param (e.g. locale) somewhere inside
    return loadPrices();
}

// Nesting a 'use cache' function inside unstable_cache is the risky shape.
const cached = unstable_cache(async () => getPrices(), ["prices"]);
```

The advisory's workaround is to stop nesting `'use cache'` functions inside `unstable_cache()`. It notes that outside the race, Next.js already throws for this pattern, so avoiding it removes the exposure. Search your repo for `unstable_cache` wrappers whose callbacks reach into functions marked `"use cache"`. If you are still on `unstable_cache` anywhere in a Cache Components app, this is a reasonable moment to move those call sites over to `'use cache'` with `cacheTag`, since mixing the two models is what makes the key ambiguous.

### Poisoned fallback shells

[GHSA-vvgp-ww4w-46vf](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf) (CVSS 4.0 6.3, 16.4.0 and later) has a longer precondition list, all of which must hold:

- `cacheComponents: true`, with `partialPrefetching` unset or `false`
- self-hosting with `next start`
- a dynamic route with a prerenderable param (via `generateStaticParams`) whose requested value was not generated at build time
- at least two never-prerenderable params below it, with a layout reading the shallower one inside a Suspense boundary
- a blocking fallback shell

Then one unauthenticated GET can poison a shell shared by every route under it. If the layout calls `notFound()`, the cached 404 is served for all URLs under that shell key with `revalidate: false`, survives restarts, and logs no error. If the layout renders the param, the server HTML shows the attacker's value (the client corrects it on hydration). The documented workaround is `partialPrefetching: true` in `next.config`.

```ts
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
    cacheComponents: true,
    // Workaround listed in the advisory until you can upgrade.
    partialPrefetching: true,
};
export default config;
```

The persistent 404 is the nasty case operationally: nothing in your logs says why a route set went dark, and a restart does not clear it. If you have seen unexplained 404s under a dynamic segment on a self-hosted Cache Components app, check this one first.

## The non-cache advisories

### HttpOnly cookies on Edge routes

[GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2) (CVSS 4.0 6.0) affects 16.0.0 through 16.4.2 and 15.0.0 through 15.5.28. When an Edge runtime route (an App Router route handler or Pages Router Edge API route) sets a cookie through `NextResponse`, Next.js leaks an internal `x-middleware-set-cookie` header into the public response. It repeats the cookie value and attributes, so same-origin JavaScript can read a cookie you marked HttpOnly. The advisory describes no workaround. If you issue session cookies from Edge handlers, this is the one to prioritise, and consider rotating sessions issued before you patched.

### Response desync in self-hosted setups

[GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385) (CVSS 4.0 6.3) concerns self-hosted apps that return a fetched upstream response unchanged. Behind an HTTP/1.1 reverse proxy that queues pipelined responses, an attacker-controlled upstream whose declared framing does not match its body can desynchronise responses between clients. The advisory page lists its affected range inconsistently, so I can't quote one. It lists no workaround, but the shape suggests a mitigation worth considering: construct a new `Response` from the upstream body and selected headers rather than forwarding it verbatim. That is my inference, not advice from the advisory.

### SVG rejection bypass

The seventh item, GHSA-7qx7-33qx-rqx2, is an SVG rejection bypass in image optimization. The release notes give only the title and I did not read the advisory, so I can't say more.

## What to do this week

1. Upgrade to 16.4.5 or 15.5.29, and note which line you are on: only the three non-cache advisories are listed for 15.x.
2. Grep for `unstable_cache` wrapping `"use cache"` functions.
3. If you self-host with `cacheComponents: true`, check whether your routes match the fallback-shell preconditions, and set `partialPrefetching: true` if you cannot upgrade immediately.
4. Review where Edge routes set session cookies.
5. Check what your reverse proxy does with HTTP/1.1 pipelining, and whether any route returns upstream `fetch` responses unchanged.

## Trade-offs

`partialPrefetching: true` is a behaviour change in how shells are prefetched, not a pure security toggle, so test navigation after enabling it. Removing `unstable_cache` nesting may mean refactoring shared data helpers. Neither is a reason to delay the upgrade, but both are reasons to run your E2E suite against the patched build rather than only bumping the version.

## Sources

- [Next.js v16.4.5 release notes](https://github.com/vercel/next.js/releases/tag/v16.4.5)
- [Next.js v15.5.29 release notes](https://github.com/vercel/next.js/releases/tag/v15.5.29)
- [Next.js releases index](https://github.com/vercel/next.js/releases)
- [GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h)
- [GHSA-vvgp-ww4w-46vf](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf)
- [GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385)
- [GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2)
