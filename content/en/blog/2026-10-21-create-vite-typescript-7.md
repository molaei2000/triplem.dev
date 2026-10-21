---
title: "create-vite adopted TypeScript 7 for a day: what the rollback says about your toolchain"
description: "create-vite 9.3.0 moved templates to TypeScript 7, and 9.3.1 pinned v6 again a day later. Here is what blocks TS 7 in real projects and how to run both versions."
date: 2026-10-21
cover: /images/blog/2026-10-21-create-vite-typescript-7.svg
tags: [typescript, vite, tooling]
draft: false
---

Two Vite scaffolder releases landed on consecutive days, and together they are a useful map of where TypeScript 7 stands in practice. [create-vite 9.3.0](https://github.com/vitejs/vite/releases/tag/create-vite%409.3.0) (19 October) switched templates to TypeScript 7 "where possible". [create-vite 9.3.1](https://github.com/vitejs/vite/releases/tag/create-vite%409.3.1) (20 October) pinned TypeScript back to v6 "for now".

Neither release changes how Vite itself builds your app. The interesting part is which templates could move, which could not, and why. That list is a decent checklist for your own migration.

## What happened

The change in 9.3.0 is [PR #23794](https://github.com/vitejs/vite/pull/23794). Per its description, these templates moved to TypeScript 7: lit-ts, preact-ts, qwik-ts, solid-ts and vanilla-ts. react-ts used TS 7 by default but fell back to TS 6 when the ESLint option was chosen. svelte-ts and vue-ts stayed on TS 6.

The next day, [PR #23841](https://github.com/vitejs/vite/pull/23841) reverted it. Its description calls it a temporary revert of #23794 "for storybook" and says to try again in a few days. It is labelled as a downstream blocker, and the page does not say what exactly in Storybook broke. I won't guess at it either.

So the signal is not "TS 7 is broken". It is that the scaffolder is a high-blast-radius consumer: every new project inherits its choice, and one downstream tool failing is enough to pull it.

## Why some templates could not move

The earlier, closed [PR #23764](https://github.com/vitejs/vite/issues/23764) records the blockers per template:

- **React with ESLint** stays on TS 6 because of typescript-eslint's compatibility requirements. React with Oxlint was fine.
- **Vue**: the current vue-tsc setup needs more compatibility work.
- **Svelte**: its TS 7 workflow currently requires keeping TS 6 installed alongside.
- **Qwik**: an existing dependency conflict with Vite 8 blocks installation (it was later switched anyway in #23794, per that PR's description).

The pattern matches what the [TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) says. TS 7 is a native port of the compiler, and 7.0 ships without a programmatic API; the post expects a new, different API in 7.1 and says tools needing programmatic access should use 6.0 until then. typescript-eslint imports `typescript` through peer dependencies, and the post says Vue, MDX, Astro, Svelte and similar tools, which embed TypeScript for editor support, will need TS 6.0 for now.

Anything that calls the compiler API, rather than shelling out to `tsc`, is on the wrong side of that line.

## Running both: the setup that follows from this

The announcement documents an alias approach so that `tsc` is 7.0 while anything importing `typescript` still gets 6.0:

```json
{
    "devDependencies": {
        "typescript": "npm:@typescript/typescript6@^6.0.2",
        "@typescript/native": "npm:typescript@^7.0.2"
    }
}
```

With that, `npx tsc` runs 7.0, and the post notes that `@typescript/typescript6` also provides a `tsc6` executable and re-exports the 6.0 API. If you only want to stay on 6.0, the post gives `npm install -D typescript@npm:@typescript/typescript6`.

A practical split for a Vite app:

```json
{
    "scripts": {
        "typecheck": "tsc --noEmit",
        "typecheck:vue": "vue-tsc --noEmit",
        "lint": "eslint ."
    }
}
```

Which of these can use the native binary depends on the tool. `tsc` can. Whether `vue-tsc` can is exactly what create-vite's Vue template could not settle, so keep it on 6.0 until its maintainers say otherwise. The announcement does not name `vue-tsc`; it names Vue and Volar's reliance on 6.0 for editor support.

## Config changes to expect on 7.0

Even where the tooling works, the announcement lists new defaults and removed options. Code that compiles cleanly on 6.0 (with `stableTypeOrdering` on and no `ignoreDeprecations`) should behave the same on 7.0, which gives you a clean migration order: get green on 6.0 first.

The notable defaults: `strict` is true, `module` is `esnext`, `rootDir` is `./`, `types` is `[]`, and `noUncheckedSideEffectImports` is true. Former deprecations are now hard errors, including `target: es5`, `downlevelIteration`, `baseUrl`, `moduleResolution` set to `node`/`node10`/`classic`, and `module` set to `amd`/`umd`/`systemjs`/`none`.

The two that bite Vite projects most often:

```jsonc
{
    "compilerOptions": {
        // 7.0: baseUrl is an error. Use paths relative to the tsconfig.
        "paths": { "@/*": ["./src/*"] },
        // 7.0: types defaults to [], so list ambient types explicitly.
        "types": ["vite/client"]
    }
}
```

Also note that `tsc file.ts` now fails when the current directory has a `tsconfig.json`, unless you pass `--ignoreConfig`. That can break ad-hoc scripts and some CI one-liners.

## Trade-offs

Moving `tsc` to 7.0 buys the speed the announcement advertises (it describes the port as about ten times faster than 6.0 in its pre-release posts). The cost is a split toolchain: two TypeScript versions in `node_modules`, an aliasing convention your teammates must understand, and a drift risk between what CI type-checks and what the editor reports.

Staying wholly on 6.0 is the simpler choice if you rely on typescript-eslint with type-aware rules, vue-tsc, or Svelte checking. 6.0 is, per the announcement's linked 6.0 post, the last release on the JavaScript codebase, so this is a holding position rather than a destination.

## What to do this week

1. Make your project clean on 6.0 with no `ignoreDeprecations`.
2. Remove `baseUrl`, legacy `moduleResolution` and friends now; this is safe on 6.0.
3. Try the alias setup in a branch and run `tsc` only through the 7.0 binary.
4. Leave API-dependent tools on 6.0 and revisit after 7.1 ships its API.
5. Watch the create-vite templates: when PR #23841's "few days" passes and they flip back, that is a free integration test run by the Vite team.

## Sources

- [create-vite 9.3.0 release](https://github.com/vitejs/vite/releases/tag/create-vite%409.3.0)
- [create-vite 9.3.1 release](https://github.com/vitejs/vite/releases/tag/create-vite%409.3.1)
- [Vite releases](https://github.com/vitejs/vite/releases)
- [create-vite changelog](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/CHANGELOG.md)
- [PR #23794: use typescript v7 where possible](https://github.com/vitejs/vite/pull/23794)
- [PR #23841: use typescript v6 for now](https://github.com/vitejs/vite/pull/23841)
- [PR #23764: extract react eslint configs](https://github.com/vitejs/vite/issues/23764)
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript devblog index](https://devblogs.microsoft.com/typescript/)
