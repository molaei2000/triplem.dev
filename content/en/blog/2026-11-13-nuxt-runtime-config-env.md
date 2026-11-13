---
title: "Nuxt pro tip: runtimeConfig only reads env vars for keys you declared, and a built server never reads .env"
description: "Three runtimeConfig mistakes that only show up in production: undeclared keys, process.env defaults frozen at build time, and .env files a built Nuxt server ignores."
date: 2026-11-13
cover: /images/blog/2026-11-13-nuxt-runtime-config-env.svg
tags: [nuxt, pro-tip, deployment]
draft: false
---

Nothing new and substantive shipped in the last 72 hours that is worth a full write-up: the newest entries were Vue 3.6 release candidates and Vite 8.x patches. So this is a pro tip about a class of bug that works on your laptop and fails after deploy: `runtimeConfig` and environment variables.

The rules below come from the [Nuxt runtime config guide](https://nuxt.com/docs/4.x/guide/going-further/runtime-config) and the [`nuxt.config` reference](https://nuxt.com/docs/4.x/api/nuxt-config). Each one is a place where dev behaviour and production behaviour diverge.

## Mistake 1: reading `process.env` in application code

```ts
// server/api/report.get.ts
export default defineEventHandler(() => {
    const key = process.env.REPORTS_API_KEY; // works in dev, fragile in production
    // ...
});
```

This bypasses the one mechanism Nuxt gives you for typed, overridable, deployment-time configuration. Declare the value in `nuxt.config` and read it through `useRuntimeConfig`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    runtimeConfig: {
        reportsApiKey: "", // private: server only
        public: {
            apiBase: "/api", // public: sent to the client in the payload
        },
    },
});
```

```ts
// server/api/report.get.ts
export default defineEventHandler((event) => {
    const { reportsApiKey } = useRuntimeConfig(event);
    // ...
});
```

Passing `event` matters in server routes: the docs show it as the way to make sure environment overrides apply at runtime.

## Mistake 2: setting an env var for a key that is not declared

A variable only overrides a property that is **already defined** in `nuxt.config`. Undeclared variables are not exposed. If `NUXT_REPORTS_API_KEY` is set but `reportsApiKey` is missing from `runtimeConfig`, you get `undefined` and no error.

The naming rule is mechanical: uppercase, `NUXT_` prefix, `_` between nesting levels, camelCase split into words. Public keys add `PUBLIC`:

| Config key                | Environment variable      |
| ------------------------- | ------------------------- |
| `reportsApiKey`           | `NUXT_REPORTS_API_KEY`    |
| `public.apiBase`          | `NUXT_PUBLIC_API_BASE`    |
| `app.baseURL`             | `NUXT_APP_BASE_URL`       |

The declared default can be an empty string. Its job is to register the key and give it a type, not to carry the value.

## Mistake 3: pointing a default at a differently named variable

```ts
export default defineNuxtConfig({
    runtimeConfig: {
        reportsApiKey: process.env.REPORTS_API_KEY, // evaluated at build time
    },
});
```

The docs are explicit that a default referencing a differently named variable only works at build time and breaks at runtime. The value is captured when `nuxt build` runs; changing `REPORTS_API_KEY` on the server later does nothing. Overrides are matched by the `NUXT_` name, at runtime. If you build one image and promote it through staging and production, this is the difference between one artifact and one build per environment.

Fix: declare the key with a neutral default and set `NUXT_REPORTS_API_KEY` where the server runs.

## Mistake 4: expecting `.env` in production

The Nuxt CLI reads `.env` during development, build and generate. A **built server does not read `.env`**. In a container, that means the file must not be what you rely on: pass variables through the real environment (`docker run --env-file`, your orchestrator's secret store, or the platform's settings).

```bash
# dev: .env is read by the CLI
nuxt dev

# production: the built server only sees the process environment
NUXT_REPORTS_API_KEY=... NUXT_PUBLIC_API_BASE=https://api.example.com node .output/server/index.mjs
```

A subtle consequence: a `.env` baked into an image can influence the build, but it will not configure the running server.

## Type casting can surprise you

Env values are cast with `destr`. The docs' own example: `NUXT_MY_VAR=4848e0` becomes the number `4848`, not the string. An API key or ID that happens to look numeric or like a boolean can change type. To keep a string, include literal double quotes in the value:

```bash
NUXT_MY_VAR='"4848e0"'
```

With `compatibilityVersion: 5`, the docs say each value is instead converted to the type of its default; booleans accept `true`/`false`, `1`/`0`, `yes`/`no` and `on`/`off`, and arrays and objects are parsed from JSON. That is a version-specific behaviour, so check which mode your project uses before relying on either.

## Validate with a schema

Values can also be a Standard Schema such as Zod or ArkType, which turns "undefined in production" into a startup failure:

```ts
import { z } from "zod";

export default defineNuxtConfig({
    runtimeConfig: {
        reportsApiKey: z.string(),
        public: {
            mode: z.enum(["preview", "production"]).default("production"),
        },
    },
});
```

Per the docs, a schema value without a default produces a build warning, and the server will not start until it is set. Prerendering fails only when a page actually reads the missing value. Two limits to remember: refinements such as minimum length are not checked, and transforms are not supported. It is a presence-and-type check, not full validation.

## Trade-offs and caveats

- **Public means public.** Everything under `runtimeConfig.public` (and `app`) goes into each page payload. Do not put secrets there, and do not copy a private key into `useState`, which can leak it to the client.
- **Serialisable only.** Functions, Sets and Maps do not survive. Build them in a plugin or middleware.
- **Reserved keys.** `app` and `appSecret` belong to Nuxt. `appSecret` is a private root secret set through `NUXT_APP_SECRET`; the docs ask for at least 32 random bytes, a different value per environment, and stability across deployments. Builds never generate one, dev generates one in `.nuxt/app-secret`.
- **Types are not runtime.** Augmenting `RuntimeConfig` changes types only. Without a schema, values are still cast with `destr`, so the type can disagree with what the app receives.
- **When `process.env` is fine.** Build-only settings, such as choosing a module option or a deployment preset inside `nuxt.config.ts`, can legitimately read `process.env`: they are supposed to be fixed at build time.

## A quick checklist

1. Every env-configurable value has a declared key in `runtimeConfig`.
2. Secrets are top-level keys; only genuinely client-safe values live under `public`.
3. No `process.env.OTHER_NAME` defaults for values that must change per environment.
4. Production gets variables from the real environment, never from `.env`.
5. Anything that must exist has a schema, so a missing value stops the server instead of failing a request later.

## Sources

- [Nuxt runtime config guide](https://nuxt.com/docs/4.x/guide/going-further/runtime-config)
- [Nuxt configuration reference](https://nuxt.com/docs/4.x/api/nuxt-config)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
