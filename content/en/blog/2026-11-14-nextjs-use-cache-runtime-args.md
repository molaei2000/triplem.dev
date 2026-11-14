---
title: "Next.js pro tip: read cookies() outside 'use cache' and pass the value in as an argument"
description: "Cached scopes can't call cookies() or headers(). Read them outside, pass the value as an argument so it joins the cache key, and know what a build hang and serverless really mean."
date: 2026-11-14
cover: /images/blog/2026-11-14-nextjs-use-cache-runtime-args.svg
tags: [next.js, pro-tip, caching]
draft: false
---

With Cache Components on, `'use cache'` is the main way to give data a lifetime. The mistake that keeps showing up is trying to make a cached function aware of the request: reading `cookies()` inside it, or smuggling a request-derived promise in. Both fail, in two different ways, and one of them fails late.

This is checked against the current [Caching](https://nextjs.org/docs/app/getting-started/caching) guide and the [`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache) reference (last updated 2026-11-06). Everything below assumes `cacheComponents: true` in `next.config.ts`.

## The problem pattern

```tsx
// lib/prefs.ts
import { cookies } from "next/headers";
import { cacheLife } from "next/cache";

export async function getPrefs() {
    "use cache";
    cacheLife("hours");

    const session = (await cookies()).get("session")?.value; // not allowed here
    return db.prefs.find({ session });
}
```

The reference is explicit: cached functions and components cannot access runtime APIs such as `cookies()`, `headers()` or `searchParams`, and the restriction follows the call stack. A helper that the cached function calls and that reads one of them fails the same way, with the `next-request-in-use-cache` error.

The part worth remembering is when it fails. The docs note that on a dynamically rendered route the error surfaces when the route runs, so it can pass `next build` and then fail under `next start`. A green build is not evidence that the cached scope is clean.

## The fix: read outside, pass the value in

```tsx
// app/profile/page.tsx
import { cookies } from "next/headers";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfileContent />
        </Suspense>
    );
}

// not cached: reads runtime data
async function ProfileContent() {
    const session = (await cookies()).get("session")?.value;
    if (!session) return <p>Signed out</p>;
    return <CachedPrefs sessionId={session} />;
}

// cached: receives the extracted value as a prop
async function CachedPrefs({ sessionId }: { sessionId: string }) {
    "use cache";
    cacheLife("hours");
    const prefs = await db.prefs.find({ session: sessionId });
    return <pre>{JSON.stringify(prefs)}</pre>;
}
```

(Add `import { cacheLife } from "next/cache"` at the top.) The docs call this the preferred pattern. Three things make it work:

- **The uncached component owns the runtime read**, and sits inside `<Suspense>`. Runtime API access without a boundary triggers the blocking-route insight in the dev overlay. The rest of the page, including any cached or static content, still ships in the static shell.
- **Arguments become part of the cache key.** The key is built from the build ID, a hash of the function's location and signature, and the serializable arguments or props. Different `sessionId` values get separate entries. Variables captured from an outer scope are bound as arguments too, so a closure does not escape the key.
- **The value must be serializable.** Primitives, plain objects, arrays, dates, maps and sets are fine. Class instances, symbols and `URL` instances are not.

## The quieter failure: a build that hangs

Passing the `cookies()` result itself, without awaiting it, compiles and looks tidy:

```tsx
async function Dynamic() {
    const cookieStore = cookies();
    return <Cached promise={cookieStore} />; // build hangs
}

async function Cached({ promise }: { promise: Promise<unknown> }) {
    "use cache";
    const data = await promise; // waits for runtime data during prerender
    return <p>{String(data)}</p>;
}
```

The cached function waits for a value that cannot exist during prerender. The docs say the build times out after 50 seconds with "Filling a cache during prerender timed out", and list the same trap with request-derived promises reached through closures or a shared `Map`. The rule is the same as above: await the runtime value outside, pass the plain value in.

## What the cache is actually worth at runtime

This is the trade-off people skip. The Caching guide points out that a cached component gated behind request data, like `CachedPrefs` above, is not added to the prerendered static shell. At runtime it lives in the default in-memory store, and the reference spells out the consequence by environment:

| Environment | Runtime behaviour with the default handler |
| --- | --- |
| Self-hosted | Entries persist across requests; size is controlled with `cacheMaxMemorySize`. |
| Serverless | Entries typically don't persist across requests, so the function may run again each time. |

So per-session caching with `'use cache'` is a real win on a long-lived Node server and possibly no win on serverless. If you need durable, shared entries, the docs point to `'use cache: remote'`, which requires a cache handler on your platform. It adds a network round trip to check the cache and typically platform fees, and the docs say it pays off only at a high hit rate. Also remember none of these stores survive a new deploy, because the build ID (or `deploymentId`) is in the key.

There is a second payoff that does not depend on server memory. With Partial Prefetching, a `use cache` call fed by values extracted from runtime APIs joins the per-link prefetch. The lifetime you assign is what lets the result be treated as fresh by the client for its `stale` window, even when server-side entries rarely survive between requests.

## When `use cache: private` is the right call

The docs reserve [`'use cache: private'`](https://nextjs.org/docs/app/api-reference/directives/use-cache-private) for the cases where you must read runtime data directly inside the cached scope: compliance requirements, or code you can't refactor to take arguments. Its results live in the browser only, as part of the prefetch. It is the exception, not the default. If you can lift the `cookies()` call one function up, do that.

## Two smaller rules from the same pages

- **Don't read what you don't need.** Pass `session.id`, not the whole cookie store or the full session object. A narrower argument means fewer cache entries and no accidental key churn from unrelated fields.
- **Always pair the directive with `cacheLife`.** Without it the implicit `default` profile applies: 5 minutes stale on the client, 15 minutes to revalidate on the server, and no time-based expiry. That is rarely what you meant for per-user data.

## Checklist

1. Search cached files for `cookies(`, `headers(` and `searchParams`. Each hit is a bug waiting for runtime.
2. Move the read into an uncached component under `<Suspense>`, `await` it, and pass the value down.
3. Never pass the un-awaited promise.
4. Decide if the hosting model gives you a runtime cache at all. If not, the win is the static shell and prefetch, not per-request reuse.
5. Test with `next start`, not only `next build`.

## Sources

- [Next.js docs: Caching](https://nextjs.org/docs/app/getting-started/caching)
- [Next.js docs: use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache)
