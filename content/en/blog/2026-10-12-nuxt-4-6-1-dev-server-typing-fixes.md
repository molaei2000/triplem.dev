---
title: "Nuxt 4.6.1: the follow-up patch for dev-server handlers, $fetch types and Vite 8.1+"
description: "Nuxt 4.6.1 fixes dev-server handler registration, nodenext type resolution, global $fetch typing and Vite 8.1+ optimizer hints. What to check before upgrading."
date: 2026-10-12
cover: /images/blog/2026-10-12-nuxt-4-6-1-dev-server-typing-fixes.svg
tags: [nuxt, nitro, typescript]
draft: false
---

Nuxt 4.6 shipped a large surface: `nuxt/server`, sessions, a rebuilt typed `$fetch`, CLI v4. Days later, the [v4.6.1 release](https://github.com/nuxt/nuxt/releases/tag/v4.6.1) (listed on October 9) lands 25 fixes. It's a patch, but its contents read like a map of where the 4.6 changes rubbed against real projects. If you upgraded to 4.6 and saw odd dev-server behaviour or type errors, this is the release to read.

The release page lists fixes only, with no prose. Where I interpret what a fix means, I say so.

## Dev server handlers

This is the biggest cluster. The 4.6 line makes the dev server handler portable, and the patch tidies up the seams:

- Each dev server handler is now registered once. The wording suggests duplicate registration was possible; I couldn't find a linked issue describing symptoms, so I won't guess at them.
- Dev handler paths are matched on both Nitro majors. That fits the 4.6 goal of working across Nitro v2 and v3.
- Nuxt dev server handlers now receive a `RequestEvent`, in line with the portable event type introduced with `nuxt/server`.
- Deploy target plugins work in dev, and the dev error report includes the request.
- The error page render receives the path.
- Dev error broadcast is disabled if `BroadcastChannel` throws, a fix done together with Vite.

If you wrote a module or a dev-only middleware against the 4.6.0 handler shape, retest it on 4.6.1. The practical advice: don't rely on handler registration order or count in dev, because that's exactly the area being corrected.

## Types: $fetch, nodenext and exports

The rebuilt `$fetch` was the headline of 4.6, so it's no surprise that several fixes touch typing:

- The global `$fetch` is typed with Nuxt's `TypedFetch`.
- Any `baseURL` is accepted when the fetch response type is named. My reading is that a named response type combined with a custom base URL was previously rejected.
- `Serialize` object types are aligned with JSON.
- Types reachable from the async data composables are exported, which matters if you write wrappers around `useAsyncData` or `useFetch` and need to name the return type.
- `false` is allowed in `setPageLayout` types.
- `nitropack/types` declarations resolve under `nodenext`.

The last one deserves attention if you moved a package or a layer to `nodenext` resolution:

```jsonc
// tsconfig.json of a shared package or layer
{
    "compilerOptions": {
        "module": "nodenext",
        "moduleResolution": "nodenext"
    }
}
```

Under that setting, subpath resolution is strict about package `exports`, so a declaration that resolved under `bundler` can fail. If you worked around that with a `paths` alias to `nitropack/types`, try removing the alias after upgrading and run `nuxt typecheck`.

A typed wrapper is the kind of code that benefits from the exported async data types:

```ts
// composables/useApi.ts
export function useApi<T>(url: string) {
    // The wrapper keeps Nuxt's key, dedupe and caching behaviour intact
    return useFetch<T>(url, { key: `api:${url}` });
}
```

The release page doesn't name the types that became reachable, so check your editor's suggestions rather than relying on names from memory.

## Vite-side fixes

Three fixes sit in the Vite integration:

- The deps hint now matches Vite 8.1+ optimizer messages. If you run a newer Vite than Nuxt's baseline, the hint was presumably not being recognised.
- The dependency scan no longer aborts on virtual imports inside installed packages.
- Inline style URLs detect the enclosing string delimiter, so a `url()` inside a quoted style is parsed correctly.

Separately, the server bundle now resolves `unhead` from Nuxt, and the Nuxt runtime is inlined when it resolves to Windows paths. Windows users hitting odd server-bundle resolution should look here first.

## Runtime, hydration and housekeeping

One runtime fix is worth reading twice: `onServerPrefetch` is preserved for `useId` hydration. `useId` generates ids that must match between server and client; losing the server prefetch hook could plausibly produce hydration mismatches. The notes don't describe a failing case, so treat this as my inference: if you saw id mismatch warnings after 4.6, retest.

Smaller items:

- Kit installs the package a missing subpath belongs to, which improves the failure path when an import can't be resolved.
- The nightly version regexp is aligned with the nightly version format.
- The Schema package ignores `.wrangler`, useful for Cloudflare projects.
- The `publishConfig` export extension was updated.

## Should you upgrade?

My take, reading release notes rather than running benchmarks:

1. If you're on 4.5.x and haven't moved to 4.6, go straight to 4.6.1.
2. If you're on 4.6.0 and use custom dev server handlers, modules that hook the dev server, or `nodenext` layers, upgrade and retest. That's where the fixes concentrate.
3. If you have none of those, the patch is low-risk housekeeping.

```bash
npx nuxt upgrade --dedupe
```

Then run your type check and a production build, because several fixes alter type resolution and the server bundle rather than browser behaviour.

## Trade-offs and caveats

A quick patch after a minor tells you something. The 4.6 minor changed the server surface and the type system at once, and projects with unusual setups (nodenext layers, Windows paths, newer Vite) found gaps quickly. That's normal, and it supports a habit: pin minors in CI, let a branch take the first patch, and promote once your typecheck passes.

It also shows how much Nuxt's behaviour now depends on the Vite and Nitro versions underneath. Fixes that mention Vite 8.1+ messages and both Nitro majors mean your effective behaviour is a three-way combination. Record the Nuxt, Vite and Nitro versions in bug reports, because the same Nuxt patch can behave differently across them.

## Sources

- [nuxt/nuxt v4.6.1 release notes](https://github.com/nuxt/nuxt/releases/tag/v4.6.1)
- [nuxt/nuxt releases](https://github.com/nuxt/nuxt/releases)
