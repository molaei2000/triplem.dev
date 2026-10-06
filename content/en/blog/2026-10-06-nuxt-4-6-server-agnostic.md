---
title: "Nuxt 4.6: a server-agnostic nuxt/server, built-in sessions and a rebuilt typed $fetch"
description: "Nuxt 4.6 adds the nuxt/server import surface, sealed-cookie sessions with appSecret, a rebuilt typed $fetch and Vapor interop. What changes and what to check."
date: 2026-10-06
cover: /images/blog/2026-10-06-nuxt-4-6-server-agnostic.svg
tags: [nuxt, nitro, typescript, vapor]
draft: true
---

Nuxt 4.6 is less a feature release than a preparation for Nuxt 5. The [official announcement](https://nuxt.com/blog/v4-6) frames it around one idea: server code should stop depending on h3 and Nitro specifics. Around that sit sessions, a rebuilt typed `$fetch`, Vue Vapor interop and a new CLI. The GitHub release page lists it with a date of October 5; the blog post itself doesn't state a date, so I'm not pinning one down here.

## nuxt/server: a portable server surface

Until now, server routes imported helpers such as `defineEventHandler` and `getQuery` from h3, usually through auto-imports. 4.6 adds `nuxt/server` as an explicit, public import surface with web-standard types. Per the [release notes](https://github.com/nuxt/nuxt/releases/tag/v4.6.0), it is meant to work across Nitro v2, Nitro v3 and the experimental `@nuxt/vite-server`.

```ts
import { defineEventHandler, getQuery } from "nuxt/server";

export default defineEventHandler((event) => {
    const { name } = getQuery<{ name?: string }>(event);
    return { message: `Hello, ${name ?? "world"}!` };
});
```

The point is the upgrade path. According to the announcement, Nuxt 5 moves to Nitro v3 and h3 v2. Code written against `nuxt/server` should not care about that jump; code written against h3 directly will.

### Behaviour changes to check

The release notes list several changes that matter if you migrate:

- Auto-imported `defineEventHandler`, `getQuery` and `readBody` still come from h3, while explicit `nuxt/server` imports use the portable API. Mixing the two in one file throws `NUXT_E8012`.
- `sendRedirect` now returns a response instead of sending it.
- `createError` takes `status` and `statusText`.
- Response headers are set through `event.res.headers`.

So this is not a find-and-replace on import paths. Handlers that send redirects or set headers imperatively need real edits. Do the migration per file, not per directory, to avoid the mixed-import error.

## Sessions and appSecret

4.6 introduces `runtimeConfig.appSecret`, set through `NUXT_APP_SECRET`. According to the release notes, it is generated automatically in development and required in production. The announcement adds that modules can derive their own secrets from it.

On top of that sit session helpers that seal data into a cookie using iron, so no server-side storage is involved:

```ts
import { defineEventHandler, useSession } from "nuxt/server";

export default defineEventHandler(async (event) => {
    const session = await useSession<{ visits: number }>(event);
    await session.update((data) => ({ visits: (data.visits ?? 0) + 1 }));
    return { visits: session.data.visits };
});
```

Trade-offs worth thinking through before you replace an auth library with this:

- Sealed-cookie sessions live in the browser. Cookie size limits apply, and you can't revoke a single session server-side without extra machinery such as a denylist.
- Rotating `NUXT_APP_SECRET` presumably invalidates existing sessions. I did not find that spelled out in the pages I read, so test it before relying on it.
- The production requirement means a deploy without the variable will fail loudly. Add it to your container or platform config before upgrading.

It is a good fit for small things like flash state, CSRF-style tokens or lightweight preferences. For anything with login, roles and revocation, it is a building block, not a full solution.

## Typed $fetch, rebuilt on fetchdts

The typed `$fetch` was redesigned using `fetchdts`. The announcement says the old approach hit TypeScript instantiation limits as route counts grew, and the new one scales with call sites rather than with the number of routes. It also validates body, query and headers against the route handler at compile time.

The numbers reported are striking: a 3,000-route app that previously hit errors now type-checks in 0.62 seconds versus 53.63 seconds before, and the release notes cite 12.8M type instantiations dropping to 51K for 1,000 routes. Treat these as the authors' own measurements on their own workload. I couldn't find the machine, project shape or TypeScript version, so don't expect the same ratio on your app. The direction is still believable: type cost that grows with call sites is the right shape for large monorepos, and `pnpm typecheck` time is a number you can compare yourself before and after.

## Vue Vapor interop

Nuxt now supports Vue 3.6's Vapor Mode in interop, so you opt in per component rather than rewriting the app. The announcement shows the config switch:

```ts
export default defineNuxtConfig({
    vue: { vapor: true },
});
```

The release notes also mention a `<script setup vapor>` syntax for individual components. Vue 3.6 was still at release-candidate stage in the last post I covered, so this is a way to experiment, not a default I'd turn on across a production app. Keep it behind a branch and measure.

## CLI v4 and dev errors

Nuxt CLI v4 ships alongside, with an interactive terminal panel showing URLs, startup progress and single-key shortcuts. The announcement reports the install shrinking by 73% (13.1 MB to 3.5 MB) and first paint of the dev UI being 6.6 times faster. Dev errors now go through `my-bad` instead of Youch, with source-mapped stack traces and code frames.

The release notes also mention an addon system for `useFetch` and `useAsyncData`, which lets you add custom options and middleware without Nuxt taking an opinion. If you have wrapper composables around either, it is worth reading when you next touch them.

## Upgrading

- The new Node requirement is `^22.22.3 || ^24.15.0 || >=26.0.0`. Check your CI image and your container base before anything else.
- Nuxt 3 reached end-of-life on July 31, 2026, and Nuxt 2 and `@nuxt/bridge` are no longer supported. `nuxt init` is replaced by `npm create nuxt@latest`.
- Upgrade with `npx nuxt upgrade --dedupe`.
- To preview Nuxt 5 defaults today, set the compatibility flag:

```ts
export default defineNuxtConfig({
    future: { compatibilityVersion: 5 },
});
```

My suggested order: upgrade with no code changes, fix the Node version, then enable the Nuxt 5 flag on a branch and see what breaks. Only after that migrate server handlers to `nuxt/server`, one file at a time.

## What to take away

If your app has a handful of server routes, 4.6 is a routine upgrade with a Node bump. If you maintain many handlers or modules that import from h3, the value of `nuxt/server` is that you pay the migration cost once, now, in a minor release, instead of during the Nitro v3 jump. The sessions feature is useful but narrow, and the typed `$fetch` rebuild is the change most likely to pay off quietly in large codebases.

## Sources

- [Nuxt 4.6 announcement](https://nuxt.com/blog/v4-6)
- [nuxt/nuxt v4.6.0 release notes](https://github.com/nuxt/nuxt/releases/tag/v4.6.0)
- [nuxt/nuxt releases](https://github.com/nuxt/nuxt/releases)
- [Nuxt blog index](https://nuxt.com/blog)
