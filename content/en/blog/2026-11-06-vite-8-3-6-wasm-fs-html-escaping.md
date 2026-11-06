---
title: "Vite 8.3.6: .wasm files now respect server.fs, and the dev server escapes HTML attributes"
description: "Vite 8.3.6 (November 5) rejects .wasm outside server.fs, escapes HTML attributes and ANSI output, and fixes chunk import map hashes. What to check before upgrading."
date: 2026-11-06
cover: /images/blog/2026-11-06-vite-8-3-6-wasm-fs-html-escaping.svg
tags: [vite, tooling, security]
draft: false
---

Vite 8.3.6 was marked Latest on the [GitHub releases page](https://github.com/vitejs/vite/releases) on November 5, two weeks after [8.3.5](/blog/2026-10-22-vite-8-3-5-bundled-dev). The [release notes](https://github.com/vitejs/vite/releases/tag/v8.3.6) have no security section and no advisory. Still, three entries touch security-relevant ground: `.wasm` files outside `server.fs` are now rejected (#23914), HTML attributes are escaped in the server (#23995), and ANSI escape sequences are escaped for `server.forwardConsole` (#23933). Those are the ones I would read first. The rest is a normal patch: bundled-dev fixes, optimizer and resolver corrections, and a chunk import map hash fix.

## The `.wasm` change and `server.fs`

Vite's dev server restricts which files it will serve. According to the [server options docs](https://vite.dev/config/server-options), `server.fs.strict` defaults to `true`, and with it enabled a request for a file outside the `server.fs.allow` list gets a 403, unless an allowed file imports it. When `allow` is not set, Vite looks for a workspace root (a `workspaces` field, `lerna.json` or `pnpm-workspace.yaml`) and falls back to the project root. `server.fs.deny` is a separate blocklist, with defaults covering `.env*`, key and certificate files, `.npmrc`, `.yarnrc.yml` and `.git`, and it wins over `allow`.

The release note says only that `.wasm` files outside `server.fs` are rejected. It does not say which code path previously let them through, and I did not read the PR, so I will not guess at the mechanism. The practical reading is that `.wasm` is now held to the same boundary as other served files.

What that means for you:

- If your `.wasm` lives inside the project root or a detected workspace root, nothing changes.
- If it lives in a sibling package of a monorepo that Vite does not detect as the workspace root, or in a path outside it, expect a 403 in dev after upgrading.
- If you have set `server.fs.allow` yourself, auto-detection is off (per the docs), so the list has to cover the wasm location explicitly.

A fix that keeps the default detection and adds your own directory:

```ts
// vite.config.ts
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
    server: {
        fs: {
            allow: [
                // keep Vite's workspace-root detection
                searchForWorkspaceRoot(process.cwd()),
                // the directory that holds your .wasm artifacts
                "../shared/wasm",
            ],
        },
    },
});
```

The docs note that setting `allow` disables auto-detection and recommend `searchForWorkspaceRoot` to keep it, which is what the snippet does. Do not loosen `allow` to a very broad path just to silence the error; a wide `allow` weakens the boundary that `server.fs.strict` exists to enforce.

## HTML attribute escaping

The note reads "escape HTML attributes" under the server scope. Vite's dev server rewrites and injects into HTML, so values that end up in attributes are a classic place for a quote to break out. The notes do not say which attributes or which inputs, so I cannot tell you whether any real-world setup was exploitable. What is safe to say: after the upgrade, attribute values that previously contained raw quotes or angle brackets may be emitted differently. If a custom `transformIndexHtml` hook builds attributes by string concatenation, rerun your dev smoke test and look at the served HTML. Your hook is still responsible for its own output in `vite build`, which this entry does not mention.

## Forwarded console output

`server.forwardConsole` sends unhandled errors and `console.error`/`console.warn` from the browser to the dev server terminal. Per the docs, its default is automatic: `true` when an AI coding agent is detected through `std-env`, otherwise `false`. That makes the 8.3.6 change more relevant than it looks. Browser-originated strings are now printed in a terminal that an agent may be reading, and raw ANSI escape sequences in that text can recolour, overwrite or hide lines. Escaping them means the forwarded text appears as text. I would not claim this blocks prompt injection, because the notes make no such claim, but keeping control sequences out of agent-visible logs is a sensible baseline.

If you want the behaviour explicit instead of detection-based:

```ts
export default defineConfig({
    server: {
        forwardConsole: {
            unhandledErrors: true,
            logLevels: ["error", "warn"],
        },
    },
});
```

The `unhandledErrors` and `logLevels` options and their allowed values come from the docs page above.

## Bundled dev, build and optimizer

Two entries are tagged bundled dev: named imports from Node built-ins are allowed (#23858), and the page reloads when HMR cannot run an entry again (#23849). The second trades a stale screen for a full reload, which is the safer failure.

Build and chunk fixes:

- Chunk import map hash signatures use stable module IDs (#23976, fixing #23975). If you use chunk import maps, rebuild twice after upgrading and confirm that hashes are identical across the two runs. Stable IDs are meant to make that true, but the notes give no failure scenario.
- Dynamic imports with appended queries are resolved when collecting CSS dependencies (#23909).
- `build.sourcemap` is respected when set from the environment (#23879).
- When `build.ssr` is `true`, the top-level `input` is used (#23898).
- A chunk that conflicts with an unused worker is kept if a live worker still uses it (#23956).

Optimizer and resolver:

- The optimizer detects its cache directory more precisely (#23912).
- Subpath imports starting with `#` are resolved with Vite's resolver (#23959), a continuation of the `#` import work in 8.3.5.
- Files with a query or hash referenced through `new URL(..., import.meta.url)` are now watched (#23780).
- `$` patterns are preserved in static alias replacements (#23703). If an alias replacement contains `$&` or similar, this is the fix you were missing.

Also relevant for SSR: external `require` calls against built-in modules are converted to `import` when `ssr.target` is `webworker` (#23759).

## Performance

Two items: preload link listeners are removed once they settle (#23922, fixing #23920), and rendered modules are indexed once per output for `cssScopeTo` (#23889). No numbers were published. The first is a leak-style fix that only matters on pages with many preloads; the second affects builds with many scoped CSS modules. Measure before claiming a win.

## Companion releases

The same day brought `plugin-legacy@8.2.4`, which also respects `build.sourcemap` from the environment, and `create-vite@9.3.4`, whose notes say it keeps TypeScript 6 when ESLint is used. That follows the TypeScript 7 back-and-forth covered in [the earlier create-vite post](/blog/2026-10-21-create-vite-typescript-7).

## Upgrade checklist

1. Bump in a branch and start the dev server. Load every page that fetches or instantiates a `.wasm` module and watch for 403s.
2. In a monorepo, check where shared wasm artifacts live relative to the detected workspace root.
3. Diff the served HTML of one page against the previous version if you have custom HTML transforms.
4. Run a production build twice and compare chunk hashes if you use chunk import maps.
5. Treat the three security-adjacent entries as hardening, not as a confirmed advisory. The release notes do not call them security fixes, so do not cite them as such in an internal report.

## Sources

- [vitejs/vite releases](https://github.com/vitejs/vite/releases)
- [Vite v8.3.6 release notes](https://github.com/vitejs/vite/releases/tag/v8.3.6)
- [Vite server options](https://vite.dev/config/server-options)
