---
title: "Vite 8.3.3: what the 8.3 line changed for Rolldown-era builds"
description: "Vite 8.3.3 shipped on October 6 after a feature-rich 8.3.0. What changed in the config merge, bundled dev, renderBuiltUrl and the optimizer, and what to check."
date: 2026-10-07
cover: /images/blog/2026-10-07-vite-8-3-patch-stream.svg
tags: [vite, tooling, rolldown]
draft: true
---

Vite 8.3.3 landed on October 6. On its own it is a four-fix patch, but it closes a month in which the 8.3 line went from a feature release (8.3.0, September 10) through three patches. Read together, the [changelog](https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/CHANGELOG.md) shows where a Rolldown-based Vite still has rough edges: config merging, the experimental bundled dev mode, and the dependency optimizer.

## What 8.3.0 added

The September 10 release carried the real features. The ones that matter for application code:

- A top-level `tsconfig` option in the Vite config.
- `server.watch` now accepts Rolldown watch options.
- `closeServer` and `closePreviewServer` plugin hooks.
- Subpath imports (`#internal/...`) work inside dynamic `import()` statements.
- `import.meta.ROLLDOWN_FILE_URL_*` is used for assets referenced from JavaScript, and is extended to other plugins.
- CSS style tags are minified, and worker search params are preserved.
- A config warning for named imports from JSON modules.
- `--profile [name]` on the CLI, so CPU profiles can be named.
- A warning when a plugin returned from `applyToEnvironment` uses hooks that are not supported there.

The last two are the quiet wins for DX. Naming profiles makes before/after comparisons in CI artifacts traceable:

```bash
vite build --profile baseline
# change something
vite build --profile after-chunk-split
```

The JSON warning is worth a look: grep for named imports from `.json` files, such as `import { version } from "./package.json"`, and see whether your build now warns. The changelog does not say what replacement it recommends.

## 8.3.1 and 8.3.2: the merge and optimizer fixes

The patches are where the trade-offs show up. Several fixes are about `mergeConfig` and about Rolldown-specific options:

- 8.3.1 fixes merging of `build.rolldownOptions.output.comments` and handles `server.ws: false` correctly in `mergeConfig`.
- 8.3.2 fixes merging of `build.rolldownOptions.output.minify`.

If you keep a shared base config and extend it per app or per environment, this is the pattern that was affected:

```ts
import { defineConfig, mergeConfig } from "vite";

const base = defineConfig({
    build: { rolldownOptions: { output: { minify: true } } },
});

export default mergeConfig(
    base,
    defineConfig({
        build: { rolldownOptions: { output: { minify: false } } },
    }),
);
```

The changelog only says the merge was corrected; it does not describe the old failure mode. So the practical advice is to check the built output of any app that overrides these options through `mergeConfig`, rather than assume which direction the bug went.

The optimizer got three notable corrections across the two patches:

- It no longer skips imports whose binding name starts with `type` (8.3.1).
- Discovered dependencies that were still pending are processed before initialization (8.3.1).
- Excluded optional peer `require` fallbacks are preserved (8.3.2), and warnings for unsupported `browser: false` mappings are avoided.

If you saw a missing export or an unexpected full reload after dependency discovery on a 8.3.0 install, these are the first entries to compare against.

## Bundled dev mode keeps getting fixes

The changelog refers to a "bundled-dev" environment, which I understand to be the experimental mode from the 8.1 cycle ([the Vite blog](https://vite.dev/blog) lists "Announcing Vite 8.1" on June 23; I did not read that post). 8.3.2 contains two fixes specific to it: lazy chunk sourcemaps are now served, and the Rolldown runtime is served from the installed Rolldown package. Treat that as evidence the mode is still maturing. If you opted in, pin the minor version and keep a way to switch back to the default dev server.

## renderBuiltUrl and CSS preloading

8.3.2 changed two connected things. CSS preloading is corrected when `renderBuiltUrl` produces URLs that contain query parameters, and queries are now passed through to `renderBuiltUrl`. If you serve assets from a CDN and append a cache-busting or signing query in `renderBuiltUrl`, test a production build with a lazy-loaded route: the preload helper is the path that was affected. 8.3.2 also removed a quadratic link scan in that preload helper, which matters for apps with many preloaded CSS chunks.

## Smaller items worth knowing

- 8.3.2 avoids encoding intermediate source maps, a build performance improvement. No numbers were published, so measure on your own project.
- `forwardConsole` output of objects and arrays is now limited, to avoid excessive logging.
- The SSR module runner `sourceURL` now encodes whitespace.
- Worker URLs are aligned between client and server when using terser.
- 8.3.2 switches the repo from `cross-spawn` to `tinyexec` and updates its Vitest monorepo dependency to v5. Both are internal.
- 8.3.3 checks `fs.serve` for `?vite-wasm-instance` requests, stores `safeModulePaths` as ids rather than URLs, and drops queries from the filename passed to `transformIndexHtml`.

That last one can bite plugin authors. If your `transformIndexHtml` hook parsed a query out of the filename, it will no longer see one:

```ts
const plugin = {
    name: "html-tweaks",
    transformIndexHtml(html, ctx) {
        // ctx.filename no longer carries a query string as of 8.3.3
        return html;
    },
};
```

The changelog states the filename should not include queries; it does not say which code paths used to include them, so grep your plugins for any `ctx.filename` parsing.

## Backports

On October 6 the [releases page](https://github.com/vitejs/vite/releases) also lists 8.2.4, 8.1.6, 7.3.7 and 6.4.4. The release notes I could read for 8.3.3 mention no security advisories or backports, and I could not see the contents of the other tags, so I will not guess what they fix. What the list does show is that Vite maintains patches across four older lines at once. If you are on 6.x or 7.x, there are patches available without a major upgrade.

## Should you upgrade?

For most projects on 8.3.x, take 8.3.3: it is a patch, and the two fixes that touch config merging and HTML transforms are precisely the kind that are silent until a production build differs. Upgrade path:

```bash
pnpm up vite@^8.3.3
pnpm build && pnpm preview
```

Diff the build output for apps that override `build.rolldownOptions.output.*` or define `renderBuiltUrl`. Skip bundled dev mode in production-critical workflows until its fix rate drops.

The caveat: the changelog entries are terse one-liners, so several of the behaviors above are inferred from titles. Read the linked pull requests before relying on any specific edge case.

## Sources

- https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/CHANGELOG.md
- https://github.com/vitejs/vite/releases
- https://github.com/vitejs/vite/releases/tag/v8.3.3
- https://github.com/vitejs/vite/releases/tag/v8.2.4
- https://vite.dev/blog
