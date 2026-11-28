---
title: "Nuxt pro tip: cache upstream calls with defineCachedFunction, and keep per-user data out of cached handlers"
description: "Nitro's cache drops request headers and keys entries by hash unless you say otherwise. Set name, getKey, maxAge and swr explicitly, and cache the shared call, not the user's route."
date: 2026-11-28
cover: /images/blog/2026-11-28-nuxt-cached-function-keys.svg
tags: [nuxt, pro-tip, nitro, caching]
draft: false
---

Nothing substantive shipped in the last 72 hours. The only release in the window was [Vue 3.6.0-rc.17](https://github.com/vuejs/core/releases), a release candidate, and the newest post on the [Nuxt blog](https://nuxt.com/blog) is still Nuxt 4.7 from November 23, which we already covered. The previous pro tip was about Next.js, so today is Nuxt, and it is about the server side: Nitro's cache.

Everything below was checked against the [Nitro v2 caching guide](https://v2.nitro.build/guide/cache) and the [current Nitro caching guide](https://nitro.build/guide/cache). The two disagree in places, and I point those out because they bite.

## The common mistake

You put a slow upstream call behind a cached handler, then the route grows a second concern: "show the signed-in user's saved items too".

```ts [server/api/dashboard.get.ts]
export default defineCachedEventHandler(
    async (event) => {
        const user = event.context.user; // set by auth middleware
        const [stars, saved] = await Promise.all([
            $fetch("https://api.github.com/repos/nuxt/nuxt"),
            getSavedItems(user.id),
        ]);
        return { stars: stars.stargazers_count, saved };
    },
    { maxAge: 60 },
);
```

This is wrong in two ways, and both come from how the cache treats the request.

1. **The cache drops request headers.** The v2 guide says all incoming request headers are dropped when handling cached responses, and only those listed in `varies` are considered. The current guide says the same for headers and adds that cookies and `authorization` are stripped unless you opt in with `allowCookies` or `allowAuthorization`. A handler that identifies the user from a cookie or token is therefore not seeing what it expects on a cache miss path you did not design for.
2. **`event.context` is shared with the incoming request.** The v2 guide warns explicitly not to render per-user data taken from it (for example data set by middleware) in a cached handler, because it will be served to other requests.

The failure mode is quiet: the first visitor's `saved` list is cached for 60 seconds and returned to the next visitor, with a 200.

## The better pattern: cache the shared call, not the route

Move the expensive, user-independent part into a cached function and leave the handler uncached.

```ts [server/utils/github.ts]
export const cachedRepoStars = defineCachedFunction(
    async (repo: string) => {
        const data = await $fetch<{ stargazers_count: number }>(
            `https://api.github.com/repos/${repo}`,
        );
        return data.stargazers_count;
    },
    {
        name: "repoStars",
        getKey: (repo: string) => repo,
        maxAge: 60 * 60,
        swr: true,
    },
);
```

```ts [server/api/dashboard.get.ts]
export default defineEventHandler(async (event) => {
    const user = event.context.user;
    const [stars, saved] = await Promise.all([
        cachedRepoStars("nuxt/nuxt"),
        getSavedItems(user.id),
    ]);
    return { stars, saved };
});
```

The upstream call is shared and cached, the user's data is always fresh, and nobody's `saved` list can leak through the cache because it never enters it. That shape follows the example in the v2 guide, which caches a GitHub star count keyed by repo.

## Set the options you depend on

Four options are worth writing down every time, because the defaults are small or differ between guides.

- **`maxAge`** defaults to `1` second in both guides. Without it you have a cache that barely caches. An explicit `0` disables caching in the current guide, which says to always set it explicitly.
- **`swr`**: the v2 guide lists a default of `true`, while the current guide lists `false`. If you read both without noticing, you will misjudge whether users can see stale values. Set it.
- **`staleMaxAge`**: in the current guide, `swr: true` without it writes no TTL, so entries stay until evicted. In the v2 guide the default is `0`, disabled. Set it if stale values should have an upper bound.
- **`name` and `getKey`**: in v2, `name` defaults to the function name or `_`, and `getKey` defaults to a hash of the arguments. The current guide warns that factory- or loop-generated functions with identical source overwrite each other's entries unless you give them an explicit `name` or `getKey`. If you build cached functions in a loop, one per tenant or per upstream, name them.

For a handler that really is public, `varies` is how you say which headers split entries. The v2 example uses `varies: ['host']`. In the current guide, `varies`, `allowQuery`, `allowCookies` and `allowAuthorization` are the knobs, and query strings are stripped unless `allowQuery` lists names. A cached `/api/search?q=...` that ignores `q` serves one result to everyone, so check how your Nitro line treats query strings before you cache anything that takes parameters.

## Invalidation and where entries live

On Nitro v2, you invalidate by removing the storage key. The key shape in the guide is `${group}:${name}:${getKey(...)}.json`, with non-word characters stripped, so a function named `getAccessToken` with `getKey: () => "default"` lives at `nitro:functions:getAccessToken:default.json`:

```ts
await useStorage("cache").removeItem("nitro:functions:repoStars:nuxtnuxt.json");
```

Note the stripped slash in that key: `nuxt/nuxt` becomes `nuxtnuxt`. The same normalisation means two different `getKey` values can collide, which the guide lists as a caveat. The guide's own `/api/products/sale-items` example omits the group and name prefix, so it is inconsistent with the stated pattern; list your storage keys once and copy the real one rather than trusting a hand-built string.

The current guide moves this to the function itself: it offers `.invalidate()` and `.expire()` on `defineCachedFunction`, and says cached handlers cannot be invalidated on demand. If you need a button that refreshes data, that is another argument for caching functions rather than handlers.

Storage is the other operational detail. In v2, production uses the in-memory driver by default, so entries are per process and vanish on restart, and the dev driver is the filesystem. To share a cache across instances, mount a driver on `storage.cache`; the guide shows Redis for this. The current guide describes `memory` as an in-process LRU with limits of 10000 entries and 100 MB, and warns that the `kv` driver has no default body-size limit, so set `maxBodySize` on routes that proxy large upstream responses.

## Trade-offs

- A cached function adds a code path to reason about. If the value is cheap to compute or changes every request, skip it.
- `swr: true` hides latency by serving stale data. That is fine for a star count and wrong for a price you charge against.
- Only `GET` and `HEAD` are cached, and responses carrying `set-cookie` or a `cache-control` of `private`, `no-store` or `no-cache` are not stored. A handler that sets a session cookie will simply never cache, which is usually correct but surprises people who expected otherwise.
- Return values are JSON-serialised, so `Map`, `Set` and symbols do not survive the round trip.

## When the cached handler is still right

A fully public route whose response depends only on the path, such as a rendered feed or a sitemap fragment, is a good fit for `defineCachedEventHandler` or a `cache` route rule. The line is simple: if any part of the response depends on who is asking, cache the shared function underneath it and let the handler stay uncached.

## Sources

- [Nitro v2: Cache guide](https://v2.nitro.build/guide/cache)
- [Nitro: Cache guide (current)](https://nitro.build/guide/cache)
- [Nuxt docs: server directory](https://nuxt.com/docs/4.x/directory-structure/server) (no caching coverage there, which is why the Nitro guides are the reference)
- [Nuxt blog](https://nuxt.com/blog)
- [vuejs/core releases](https://github.com/vuejs/core/releases)
