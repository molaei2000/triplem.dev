---
title: "Next.js pro tip: set cacheLife in every 'use cache' scope, because nested caches silently rewrite the outer lifetime"
description: "A 'use cache' scope without cacheLife inherits the default profile, and a short-lived inner cache can shrink it or fail the build. Declare the lifetime explicitly."
date: 2026-11-25
cover: /images/blog/2026-11-25-nextjs-cache-life-explicit.svg
tags: [next.js, pro-tip, caching]
draft: false
---

Nothing stable and substantial shipped in the last 72 hours that we have not covered. [Vue's latest release is still a 3.6 release candidate (rc.16)](https://github.com/vuejs/core/releases), the newest Vite line is an [8.4 beta](https://github.com/vitejs/vite/releases), and the rest are patches. So today is a pro tip, and since the previous one was about Nuxt, it is Next.js's turn. Everything below is checked against the [`cacheLife` reference](https://nextjs.org/docs/app/api-reference/functions/cacheLife), which was last updated on 2026-11-18.

The tip: **call `cacheLife` in every `use cache` scope, including the outer ones. A scope that omits it gets its lifetime from the `default` profile, and nested caches can change that result without anyone touching the outer file.**

## The common mistake

Most `use cache` code starts as a quick way to make a component static:

```tsx
// app/dashboard/page.tsx
import { Widget } from "./widget";

export default async function Dashboard() {
    "use cache";
    // no cacheLife: "whatever the default is"

    return (
        <div>
            <h1>Dashboard</h1>
            <Widget />
        </div>
    );
}
```

It works, so nobody looks at it again. The lifetime is implicit, and the docs explicitly recommend against that: they say to set a `cacheLife` in every `use cache` scope so the behaviour is clear at the call site, because omitting it leaves the `default` profile in force and makes nested scopes harder to reason about.

## What "the default" actually is

The `default` profile has three numbers, and they mean different things:

| Property     | `default` value | What it controls                                                                  |
| ------------ | --------------- | --------------------------------------------------------------------------------- |
| `stale`      | 5 minutes       | how long the client router reuses the content without asking the server          |
| `revalidate` | 15 minutes      | after this, the next request gets the cached copy and triggers a background refresh |
| `expire`     | never           | after this much time with no traffic, the next request waits for fresh content   |

`stale` is client-side only. The server sends it in an `x-nextjs-stale-time` response header, it is not a `Cache-Control` header, and a minimum of 30 seconds is enforced so prefetched links stay usable. Do not read it as a server TTL.

The other presets, from the same page:

| Profile   | `stale`    | `revalidate` | `expire` |
| --------- | ---------- | ------------ | -------- |
| `seconds` | 30 seconds | 1 second     | 1 minute |
| `minutes` | 5 minutes  | 1 minute     | 1 hour   |
| `hours`   | 5 minutes  | 1 hour       | 1 day    |
| `days`    | 5 minutes  | 1 day        | 1 week   |
| `weeks`   | 5 minutes  | 1 week       | 30 days  |
| `max`     | 5 minutes  | 30 days      | 1 year   |

## Why implicit is a trap: nesting

When an outer scope has no `cacheLife`, an inner cache with a shorter lifetime can reduce the outer one. The docs give the arithmetic: if `Widget` is on 5 minutes, `Dashboard` becomes 5 minutes; if `Widget` is on 1 hour, `Dashboard` stays at the 15 minute default, because inner caches cannot extend it.

So the outer lifetime is a function of every cached component below it, including ones in imported modules and third-party packages. Someone swapping `Widget` to a shorter profile changes what `Dashboard` serves, in a file the diff never shows.

An explicit outer `cacheLife` ends that. The docs say the outer cache then uses its own lifetime regardless of what is nested inside, longer or shorter, and a hit returns the whole output including nested data:

```tsx
import { cacheLife } from "next/cache";
import { Widget } from "./widget";

export default async function Dashboard() {
    "use cache";
    cacheLife("hours"); // decided here, not inherited

    return (
        <div>
            <h1>Dashboard</h1>
            <Widget />
        </div>
    );
}
```

## The failure that surfaces at build time

There is a second, louder version of the same problem. The prerendering rules in the reference say a cache is excluded from prerenders, and becomes a "dynamic hole" resolved at request time, when:

- `revalidate` is `0`, or `expire` is under 5 minutes;
- `stale` is under 30 seconds (a prefetch would expire before a click);
- with `stale` between 30 seconds and 5 minutes, the content is prerendered but kept out of the route's App Shell.

Of the presets, only `seconds` crosses one of these lines (its `expire` of 1 minute). If a `seconds` cache sits inside an outer `use cache` with no explicit `cacheLife`, the outer lifetime would silently become short too. Next.js refuses to let that happen quietly and throws during prerendering instead. The docs add that the nested cache may be in an imported module or a dependency, which is exactly why you cannot rely on reading the outer file.

You have two valid fixes, and the choice is the point of the tip.

**Keep the outer scope static** by giving it a real lifetime. The short-lived inner cache then no longer drags it down:

```tsx
export default async function Page() {
    "use cache";
    cacheLife("default"); // explicit, so the nested 'seconds' cache no longer errors

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Last updated: {new Date().toISOString()}</p>
            <ShortLivedWidget />
        </div>
    );
}
```

**Make the short lifetime deliberate** by pushing it into a `Suspense` boundary so the rest of the page can stay in the prerender. The docs' example uses `"use cache: remote"` for this, noting that the default in-memory cache does not persist across requests on serverless deployments and may be enough when self-hosting:

```tsx
async function Content() {
    "use cache: remote";
    cacheLife("seconds"); // intentionally short-lived
    return (
        <>
            <p>Last updated: {new Date().toISOString()}</p>
            <ShortLivedWidget />
        </>
    );
}

export default function Page() {
    return (
        <div>
            <h1>Dashboard</h1>
            <Suspense fallback={<p>Loading...</p>}>
                <Content />
            </Suspense>
        </div>
    );
}
```

## Make the vocabulary explicit, not the numbers

If your project keeps writing the same triple of numbers, define a named profile in `next.config.ts` rather than inline objects. Omitted properties inherit from `default`, so specify all three:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    cacheLife: {
        editorial: {
            stale: 600, // 10 minutes
            revalidate: 3600, // 1 hour
            expire: 86400, // 1 day
        },
    },
};

export default nextConfig;
```

Then `cacheLife("editorial")` reads the same everywhere. Two caveats from the docs. First, you can redefine built-in names such as `hours`, but a reader expects `days` to mean about a day, so a custom name is less surprising than overloading one. Second, redefining `default` changes the lifetime of every scope that calls no `cacheLife`, which is a broad blast radius for a config edit.

## Other behaviours worth knowing

- `cacheLife` must be called inside the cache scope, not at module scope, which throws.
- Call it in the same function that carries the directive. The docs advise against hiding it in a shared helper.
- It may be called in different branches, but only one call should run per invocation. That allows `cacheLife("minutes")` for a missing post and `cacheLife("days")` for a published one.
- For lifetimes read from data, pass an inline object such as `{ revalidate: post.revalidateSeconds ?? 3600 }`; `stale` and `expire` inherit from `default`.
- `cacheLife({})` applies the `default` values, so it is not a way to opt out.

## Trade-offs

Explicit lifetimes cost a line per scope and force a decision you could have deferred. That is the point, but it does mean reviewers must now ask whether `hours` is right, which is a content question rather than a code one.

Inheritance is not always wrong. A leaf component that only ever renders inside a parent that already pins its lifetime does not need its own call to be safe, and a throwaway prototype is fine on `default`. The rule matters most at the boundaries where a route, a layout or a reusable component starts a cache, because those are the scopes whose lifetime other people will depend on.

Finally, explicit does not mean correct. `expire: never` in `default` means an entry nobody requests is not evicted by time alone, so tag your scopes with `cacheTag` and invalidate on writes rather than waiting for `revalidate`.

## Sources

- [Next.js docs: `cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
- [Next.js blog index](https://nextjs.org/blog)
- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vitejs/vite releases](https://github.com/vitejs/vite/releases)
