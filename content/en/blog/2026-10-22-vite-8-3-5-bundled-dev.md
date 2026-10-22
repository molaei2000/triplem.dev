---
title: "Vite 8.3.5: a bundled-dev hardening release, plus import map and optimizer fixes"
description: "Vite 8.3.5 landed on October 21 with seven bundled-dev fixes, chunk import map corrections, resolver and optimizer changes, and a move to Oxlint. What to check."
date: 2026-10-22
cover: /images/blog/2026-10-22-vite-8-3-5-bundled-dev.svg
tags: [vite, tooling, rolldown]
draft: false
---

Vite 8.3.5 was marked Latest on the [GitHub releases page](https://github.com/vitejs/vite/releases) on October 21. It is a patch, but a large one: the [release notes](https://github.com/vitejs/vite/releases/tag/v8.3.5) list roughly twenty fixes, one performance change, a lint migration and a handful of refactors. The theme is visible in the scope tags: seven entries are tagged `bundled-dev`, the experimental mode that serves a Rolldown bundle during development instead of unbundled modules. If you opted into it, this is the release to read. If you did not, several other fixes still apply to you.

## Bundled dev: what got fixed

The notes list these `bundled-dev` entries:

- `server.origin` is now applied to asset URLs (#23683).
- The fallback page declares a UTF-8 charset (#23846).
- `build.chunkImportMap` is ignored in this mode (#23685).
- User-defined `import.meta.env` values are included in the `import.meta.env` object (#23713).
- Forwarded error stacks are mapped through the bundle's source maps (#23741).
- Served output files are normalised (#23684).
- HMR propagation stops at modules that are no longer imported (#23839).

The last one deserves attention. Propagation that continues through a module nobody imports any more is the kind of bug that shows up as a stale update or a reload that should have been a hot update. The notes give only the title, so I would not claim more than that. The `import.meta.env` fix is similar: if you read user-defined values off that object, a missing key in bundled dev was a mode-specific difference worth re-testing.

A practical stance for a team using this mode: pin the minor version, keep the default dev server one script away, and run your smoke tests against both. The notes name the mode but do not say how to enable it, and I did not fetch the docs for it, so check the Vite guide for the current switch.

## Chunk import maps

Two `build` fixes concern chunk import maps:

- A missing chunk import map is now handled (#23777).
- Preload dependencies are included when hashing the chunk import map (#23793).

The second matters for cache correctness. A content hash that ignores a dependency of the chunk can leave a stale URL in the map while the file behind it changed. Again, the notes give titles only, not failure scenarios. The conservative advice: if you enabled `build.chunkImportMap`, rebuild after upgrading and diff the emitted map and chunk names between 8.3.4 and 8.3.5 before you ship.

## Resolver, CSS and server

Smaller fixes that can affect ordinary projects:

- Subpath imports with more than one `#` now resolve (#23631), and `resolve.exports` moved to 2.0.4 (#23739). If you use `package.json` `imports` with unusual keys, this is relevant.
- A literal `%` inside CSS `url()` no longer fails (#23676).
- The server strips `base` only when the path matches a full segment (#23641). My reading is that with `base: "/app"`, a request for `/application.js` should no longer be treated as `/lication.js`. The notes do not spell that out, so test it if you serve under a sub-path.
- Socket errors on upgrade requests that the HMR server does not take are handled (#23728). That affects projects that run their own WebSocket endpoint next to Vite.

## Optimizer

The dependency optimizer received four changes, mostly around lockfile detection:

- It falls back to `yarn.lock` for the lockfile hash (#23667), and skips the patches directory check in that fallback (#23725).
- It skips the patches directory hash for `nub` lockfiles (#23761).
- It scans `oxc.jsxInject` imports (#23758).

The lockfile hash decides when pre-bundled dependencies are invalidated, so a wrong or missing hash means either needless re-optimisation or stale dependencies. The `oxc.jsxInject` fix matters if you inject an import through that option: my inference is that such imports were not being scanned for discovery, which is how you end up with a late "new dependency found" reload in dev.

## Performance, lint and internals

The one performance change: SSR now extracts inline source maps without a regular expression (#23775). No numbers were published, so measure on your own app before expecting anything.

Housekeeping you may notice in the repo or in a lockfile diff:

- Vite itself migrated to Oxlint (#23746).
- `@vercel/detect-agent` was replaced with `std-env` (#23744), which swaps one dependency in the graph.
- Several dev-server refactors consolidated ModuleURL and BrowserURL handling (#23790, #23791, #23815, #23828). They are internal, but they are the shared paths for import resolution and HTML transforms, so any regression would likely show up there.

## Upgrade notes

1. Update in a branch and run a production build. Compare chunk names and any import map output with your last good build.
2. If you use bundled dev, test HMR after removing an import mid-session.
3. If you serve under a custom `base`, request a path that merely starts with the same characters as the base.
4. If you use Yarn, clear `node_modules/.vite` once, since the lockfile-hash fallback is new. This is cautious advice, not something the notes require.

Also on the releases page: Vite 6.4.5 (October 21) with no notes beyond a pointer to the changelog, and `create-vite@9.3.1` (October 20), which pins TypeScript to v6 for now according to its commit title. That ties into [yesterday's post on the TypeScript 7 rollback](/blog/2026-10-21-create-vite-typescript-7).

## Sources

- [vitejs/vite releases](https://github.com/vitejs/vite/releases)
- [Vite v8.3.5 release notes](https://github.com/vitejs/vite/releases/tag/v8.3.5)
