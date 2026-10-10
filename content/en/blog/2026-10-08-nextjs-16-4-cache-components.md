---
title: "Next.js 16.4: Cache Components become the recommendation, with ensureStatic and navigation()"
description: "Next.js 16.4 recommends Cache Components for every app and adds ensureStatic, navigation(), prefetch(), agent upgrades and a smaller Turbopack cache. What to change."
date: 2026-10-08
cover: /images/blog/2026-10-08-nextjs-16-4-cache-components.svg
tags: [next.js, caching, turbopack]
draft: false
---

[Next.js 16.4](https://nextjs.org/blog/next-16-4) shipped on October 6. The headline is not a single feature but a change of position: the team now recommends Cache Components for every Next.js app, says it becomes the default in Next.js 17, and makes it the default for anything created with `create-next-app`. The release also adds the pieces that, by their account, were missing before they felt comfortable saying that.

## The new baseline

Cache Components is the opt-in caching model built around `'use cache'`, which the post describes as a component-level counterpart to the `Cache-Control` header. Annotated components can be cached in the browser during client navigations and, optionally, on the server or at build time. It replaces the implicit caching of earlier App Router versions. You enable it with two flags:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    partialPrefetching: true,
};

export default nextConfig;
```

Partial Prefetching is now treated as part of the model rather than an add-on, so the two flags travel together.

## `ensureStatic`: a build-time guarantee

The strength of the model is streaming a static shell and dynamic holes in one response. The weakness is that one stray dynamic component can quietly turn a marketing page or a blog into request-time compute. 16.4 adds a route segment export that turns this into a build failure:

```tsx
// app/blog/[slug]/page.tsx
export const ensureStatic = "navigation";

export default function Page() {
    return (
        <>
            <UserAvatar /> {/* dynamic: fails the build */}
            <Content />
        </>
    );
}
```

There are three levels, from loosest to strictest:

- `"shell"`: only static content is fetched when the route is first discovered.
- `"prefetch"`: links with explicit prefetching fetch only static content.
- `"navigation"`: navigations to the route never render at request time.

It also works in a layout, which applies the guarantee to every page below it. Putting `"navigation"` in the root layout and relaxing it in nested layouts is a sensible default for content sites, and it makes "someone added `cookies()` in a shared component" a CI failure instead of a billing surprise.

## `navigation()` and `prefetch()`: defer work to a later stage

Adding `<Link prefetch>` removes loading states, but it also means every visible link loads everything the target route has cached. The post's example is an inbox: each message link would pull the full thread, even for messages nobody opens.

16.4 adds two functions that let a component opt out of an earlier stage by awaiting them:

```tsx
import { Suspense } from "react";
import { navigation } from "next/cache";

async function Message({ id }: { id: string }) {
    const message = await getMessage(id); // included in the prefetch

    return (
        <>
            <p>{message.subject}</p>
            <Suspense fallback={<Spinner />}>
                <Thread id={id} />
            </Suspense>
        </>
    );
}

async function Thread({ id }: { id: string }) {
    await navigation(); // skipped during prefetch, runs on real navigation
    const thread = await getThread(id);
    // ...
}
```

`await navigation()` keeps the content out of the prefetch until the user actually navigates. `await prefetch()` does the analogous thing one stage earlier: it excludes cached content from a route's shell until an explicit prefetch happens. The trade-off is plain: you buy cheaper prefetches and a lighter server load, and you pay with a visible loading state (hence the `Suspense` boundary) for the deferred part. Use it on the expensive tail, not the content that defines the page.

## Agent-oriented tooling

A sizable part of the release is aimed at coding agents, which fits the stated plan for migrating existing apps:

- `next upgrade --agent` checks your installed version, picks a target, and prepares migration guides, codemods and verification steps for your agent. The documented invocation is `npx next@canary upgrade --agent=latest`, so the upgrade tooling is current even if your app is old.
- `experimental.agentUpgrade` nudges you or your agent during `next dev` and `next build` when an upgrade is available. The policy is `'security'` by default (known vulnerabilities affecting your version), `'latest'` for newer majors and minors, or `false` to turn it off.
- `experimental.agentFeedback` lets an agent collect framework problems it hits and prepare draft reports. Per the post, you review and send them yourself, source code, logs and secrets are meant to be omitted, and it needs Next.js telemetry enabled and does not run in CI. It is on by default only for new apps made with the recommended settings.
- Skills for adopting Cache Components and Partial Prefetching, plus an experimental `next-bundle-optimizer` skill for the bundle analyzer.

Whether to enable the feedback channel is a policy question for your team. The default for existing apps is off, and I would keep it that way until someone has read what a draft report actually contains.

## Improvements for every app

These need no configuration:

- Turbopack's disk cache is 20–25% smaller, thanks to Zstandard compression for the bulk of the data while metadata stays on LZ4.
- Lazy server HMR: shared server module edits are applied only for routes a request actually needs, instead of re-updating every page you visited earlier in the session.
- A single shared Turbopack runtime chunk across routes, for smaller downloads and better cache hit rates.
- Shorter CSS Module class names in production, and export mangling to shorten internal JavaScript export names. Development keeps the long names.
- React 19.3, which the post says brings stable View Transitions, Fragment Refs and a new `browser()` API.

Shorter production class names can break anything that depends on them, such as end-to-end selectors or string-built class references. Use stable attributes for tests.

## Experimental options worth trying

All of these sit under `experimental` and can change:

```ts
const nextConfig: NextConfig = {
    reactCompiler: true,
    experimental: {
        turbopackRustReactCompiler: true,
        turbopackGc: true,
        turbopackLazyDynamicImports: true,
        turbopackPluginRuntimeStrategy: "workerThreads",
        turbopackAdditionalRoots: {
            linkedPackages: { path: path.join(__dirname, "../packages") },
        },
    },
};
```

- `turbopackRustReactCompiler` runs the React Compiler inside Next.js rather than through Babel. 16.4 adds a fast check to skip files that need no optimisation. The Turbopack team reports a 30% drop in compiler memory use and 15% in compile time, a vendor figure without a stated workload.
- `turbopackGc` removes unused compilation work from memory and disk, including stale data from earlier sessions.
- `turbopackLazyDynamicImports` compiles client-side `import()` targets only when the browser asks for them. Some `next/dynamic` imports still compile eagerly.
- `turbopackPluginRuntimeStrategy: "workerThreads"` runs Babel, PostCSS and webpack loaders in one process. On Node.js 24.13.1 and newer it currently falls back to child processes because of a Node.js bug.
- `turbopackAdditionalRoots` lets Turbopack follow symlinked dependencies outside the project root. That is the manual route to pnpm's global virtual store: add the path from `pnpm store path` as a root. Automatic integration is planned, not shipped.

The Turbopack Bundle Analyzer also gained a route summary, a sortable table view, snapshots with diffing over time, and a critical-render-path distinction.

## What to do

1. New project: nothing, Cache Components is on. Add `ensureStatic` to content routes early.
2. Existing app: do not flip `cacheComponents` on a Friday. Run `next upgrade --agent` on a branch, read the diff, and treat the migration as a rendering-model change, not a version bump. Next.js 17 making it the default is the deadline to plan against.
3. If you use `<Link prefetch>` heavily, audit what each target route pulls in and move the expensive tail behind `await navigation()`.
4. Check CI selectors against the shorter production CSS Module names.

The caveat on all of it is that the post is the vendor's own account of why the model is now ready. The cost guarantees are plausible, but verify them on your own routes by checking which parts of each page are static in a production build before committing to the migration.

## Sources

- [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- [Next.js blog index](https://nextjs.org/blog)
