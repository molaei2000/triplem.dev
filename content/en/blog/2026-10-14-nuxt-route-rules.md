---
title: "Nuxt pro tip: put caching and rendering decisions in routeRules, not in handlers"
description: "Use routeRules to pick prerender, swr, isr or ssr: false per route. Where each rule applies, what the Nitro cache does, and the caveats that bite in production."
date: 2026-10-14
cover: /images/blog/2026-10-14-nuxt-route-rules.svg
tags: [nuxt, pro-tip, nitro, caching]
draft: false
---

Nothing in the last 72 hours was substantive enough to build a post on. The Vue 3.5.44 and Vite 8.3.4 patches shipped, but the first has no readable release notes and the second continues a stream already covered. So today is a Nuxt pro tip, and the Nuxt tips so far were all about client-side data fetching. This one is about the server side: per-route rendering and caching.

Everything below is checked against the current [Nuxt rendering docs](https://nuxt.com/docs/4.x/guide/concepts/rendering) and the [Nitro routing docs](https://nitro.build/docs/routing).

## The common mistake

Caching decisions end up scattered. A `setHeader('cache-control', ...)` in one server route, a `defineCachedEventHandler` in another, a `prerender: true` buried in `nitro.prerender.routes`, and a client-only page that still gets server-rendered because nobody wrote that down anywhere.

```ts [server/api/products.get.ts]
export default defineEventHandler(async (event) => {
    // Cache policy lives inside the handler, invisible from the config
    setHeader(event, "cache-control", "s-maxage=60, stale-while-revalidate");
    return await $fetch("https://api.example.com/products");
});
```

The problem is not that this is wrong. It is that nobody can answer "which of our routes are cached, for how long, and where?" without reading every handler. Policy that changes weekly (TTLs, which sections are static) is mixed with logic that changes monthly.

## The improved pattern: one table

`routeRules` in `nuxt.config.ts` attaches behaviour to route patterns. The docs describe [hybrid rendering](https://nuxt.com/docs/4.x/guide/concepts/rendering) as setting caching and rendering rules per route, with Nuxt registering the matching middleware and wrapping routes with Nitro cache handlers.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
    routeRules: {
        "/": { prerender: true },
        "/products": { swr: true },
        "/products/**": { swr: 3600 },
        "/blog": { isr: 3600 },
        "/blog/**": { isr: true },
        "/admin/**": { ssr: false },
        "/api/**": { cors: true },
        "/old-page": { redirect: "/new-page" },
    },
});
```

That is the example from the Nuxt docs, and it is the point: the whole rendering and caching strategy of the site reads top to bottom in one place. The handler from before shrinks to the fetch.

### What each option does

From the Nuxt docs:

- `prerender: true` renders the route at build time and ships it as a static asset.
- `swr` takes a number or boolean. It adds cache headers and caches the response on the server or a reverse proxy for that TTL. After expiry, the stale response is served while the page regenerates in the background. `true` adds `stale-while-revalidate` with no max-age. On the `node-server` Nitro preset, Nitro can cache the full response itself.
- `isr` works like `swr` but also stores the response in the CDN on platforms that support it, which the docs name as Netlify and Vercel. With `true`, the content stays in the CDN until the next deploy.
- `ssr: false` makes the section render only in the browser.
- `headers`, `redirect`, `cors` and `noScripts` cover the rest.

Nitro's own docs add that when several rules match, they merge from least to most specific, and `false` disables a rule inherited from a broader pattern. That makes overrides cheap:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
    routeRules: {
        "/blog/**": { swr: 600 },
        // The draft preview must never be cached, even though /blog/** is
        "/blog/preview/**": { swr: false },
    },
});
```

## `swr` is a shortcut for `cache`

Per Nitro's docs, `swr: true` equals `cache: { swr: true }`, and `swr: 600` equals `cache: { swr: true, maxAge: 600 }`. When you need more than a TTL, such as a custom cache group or key, use the `cache` option with the full options object, which wraps matching handlers in `defineCachedHandler`. Only `swr` is documented to reset an inherited cache rule with `false`; for `cache` the docs say `false` disables caching.

## Why `ssr: false` is more than a runtime switch

A route covered by `ssr: false` is rendered only in the browser, so Nuxt can leave its page component out of the server bundle, provided build-time rules cover every path reaching that page, including dynamic routes like `pages/products/[id].vue` under `/products/**`. The docs list what defeats it:

- A more specific rule re-enables SSR beneath a client-only rule.
- An alias or absolute-path child falls outside the client-only region.
- A parent shell renders a child that is still server-rendered.

The docs stress this is only a build-time optimisation: it does not change what the server sends to the browser. If your admin area is a heavy client-only app, a single `"/admin/**": { ssr: false }` line keeps that code out of the server bundle only if you don't punch holes in it.

## Trade-offs and caveats

**Not with `nuxt generate`.** The docs are explicit that hybrid rendering is not available with `nuxt generate`. If your deploy target is a static host fed by `generate`, `swr` and `isr` do nothing; you get `prerender` or nothing.

**`isr` is platform-dependent.** The Nuxt docs name Netlify and Vercel for CDN storage. Nitro's docs describe `isr` as Incremental Static Regeneration on Vercel, with an object form accepting `expiration`, `allowQuery` and `group`. If you self-host on Node, use `swr`: it caches on the server or a reverse proxy rather than in a CDN, so with several instances behind a load balancer, expect per-instance caches unless you configure shared storage. Verify what your preset does before relying on `isr` anywhere else.

**Don't combine `prerender` and `isr`.** Nitro's docs say prerendering takes precedence and `isr` is ignored.

**Payload files.** Routes using `isr` or `swr` also generate `_payload.json` files, which client-side navigation loads instead of refetching data. That is good for navigation speed, but remember those payloads are cached too: personalised data in `useAsyncData` on a cached route ends up in a shared cache entry. Keep per-user data out of `swr` routes, or fetch it client-side.

**CORS and static assets.** Nitro's docs note that `cors` is applied by the running server, not by CDN config. On edge platforms serving prerendered assets, CORS headers only appear when the request actually reaches a server handler.

**Method-scoped rules.** A key such as `"POST /api/**"` applies only to that method, but platform-native files like `_headers` and `_redirects` cannot split by method, so use method-agnostic keys for anything a platform should emit.

**Experimental flag.** The Nuxt config reference marks top-level `routeRules` as experimental and says the API may change. Pin your Nuxt version and re-read the docs on upgrade.

**Rules from environment.** Nitro's docs mention `runtimeConfig.nitro.routeRules` for overriding rules through environment variables without rebuilding, handy for turning off a cache TTL in staging.

## When handler-level caching is still right

If the cache key depends on request data (a user id, a query parameter, a tenant), a path pattern cannot express it. Use the Nitro cache API directly inside the handler (check the [Nitro cache guide](https://nitro.build/guide/cache) for key options on your version), and keep `routeRules` for the coarse, path-shaped policy. The two compose: rules decide the shape of the site, handlers decide the keys.

## Sources

- [Nuxt docs: Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)
- [Nuxt docs: nuxt.config reference](https://nuxt.com/docs/4.x/api/nuxt-config)
- [Nitro docs: Routing and route rules](https://nitro.build/docs/routing)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Vite release v8.3.4](https://github.com/vitejs/vite/releases/tag/v8.3.4)
- [Nuxt releases](https://github.com/nuxt/nuxt/releases)
