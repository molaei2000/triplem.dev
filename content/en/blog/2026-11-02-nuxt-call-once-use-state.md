---
title: "Nuxt pro tip: initialise shared state with useState and callOnce, not module-level refs or onMounted"
description: "Module-level refs leak between SSR requests and onMounted fetches run twice or too late. Use useState with callOnce to initialise shared state once and hydrate cleanly."
date: 2026-11-02
cover: /images/blog/2026-11-02-nuxt-call-once-use-state.svg
tags: [nuxt, pro-tip, state-management]
draft: false
---

Nothing substantive and stable shipped in the last 72 hours. The only fresh releases were pre-releases: [Vue 3.6.0-rc.14 on 30 October](https://github.com/vuejs/core/releases), while the latest Nuxt release is still [4.6.3 from 27 October](https://github.com/nuxt/nuxt/releases), which we already covered. This blog skips release candidates, and the previous pro tip was about Next.js, so today is a Nuxt tip about a place where SSR apps quietly go wrong: where shared state is created and who initialises it.

Everything below is checked against the [`useState` reference](https://nuxt.com/docs/4.x/api/composables/use-state), the [`callOnce` reference](https://nuxt.com/docs/4.x/api/utils/call-once) and the [state management guide](https://nuxt.com/docs/4.x/getting-started/state-management) for Nuxt 4.x.

## The common mistakes

Two patterns show up in almost every codebase that grew from a client-only SPA.

**Mistake one: state at module level.**

```ts
// composables/session.ts
export const session = ref<{ user: string | null }>({ user: null });
```

On the client this behaves like a singleton, which is what people want. On the server, the module is evaluated once per process, so every request imports the same `ref`. The state guide is blunt about this: don't define a `ref` outside `<script setup>` or `setup()`, because it is shared across requests and can leak data between users and cause memory leaks. It is also invisible to hydration, since nothing puts that value in the payload. The client starts from its own empty `ref` regardless of what the server rendered.

**Mistake two: initialising shared data in `onMounted` or a bare top-level `await`.**

```vue
<script setup lang="ts">
const config = useState<SiteConfig | null>("config", () => null);

onMounted(async () => {
    config.value = await $fetch("/api/config");
});
</script>
```

`onMounted` never runs on the server, so the server HTML renders the empty state and the client fills it in later: a flash of missing content and a layout shift. The opposite fix, a plain `await $fetch` in setup, runs on the server and then runs again on the client during hydration, so you pay for the request twice and risk a mismatch if the two answers differ.

## The fix: a keyed composable plus `callOnce`

Wrap the state in a composable around `useState`, and initialise it with `callOnce`.

```ts
// composables/useSiteConfig.ts
export const useSiteConfig = () => useState<SiteConfig | null>("site-config", () => null);
```

```vue
<!-- app.vue -->
<script setup lang="ts">
const config = useSiteConfig();

await callOnce("site-config", async () => {
    config.value = await $fetch("/api/config");
});
</script>
```

This is the same shape the official guide uses to fill state in `app.vue` before rendering. What each piece does:

- `useState(key, init)` returns a `Ref<T>` whose data is serialised to JSON and persists through hydration. The key de-duplicates, so every component that calls `useSiteConfig()` gets the same ref. The `init` function only runs when the state has not been initialised yet.
- `callOnce` runs the function during SSR and, because it records that in the Nuxt payload, does not run it again when the page hydrates. In its default `render` mode, going back to the page on the client does not re-run it either.
- The key `"site-config"` is explicit. If you omit it, Nuxt derives one from the file and line of the call. That works, but a key you chose survives refactors and shows up in the payload in a way you can reason about.

The result: one request on the server, no duplicate on the client, server HTML that already contains the data.

## `mode: "navigation"` for per-navigation side effects

The default `render` mode is about the initial render. If you want a function to run once on first load and again on every client-side navigation, while still skipping the duplicate during SSR and hydration, pass `mode`:

```vue
<script setup lang="ts">
await callOnce(
    "track-visit",
    () => {
        console.log("first load, then every client-side navigation");
    },
    { mode: "navigation" },
);
</script>
```

The docs list `navigation` mode as available since Nuxt 3.15, so it is safe on any current Nuxt 4 app. Typical uses are analytics page views and refreshing a small piece of shared state when the route changes. It is the declarative replacement for a watcher on `route.path` that has to special-case the first run.

## Pinia stores follow the same idea

If your shared state lives in a Pinia store, the guide recommends the same pattern: call the store's loading action through `callOnce`, for example `await callOnce(website.fetch)`. The action runs on the server, the store state is carried to the client, and hydration doesn't repeat the fetch.

## Trade-offs and caveats

- **`callOnce` returns `Promise<void>`.** It does not hand back your function's result, so it is not a data-fetching primitive. For data a single page owns, use `useAsyncData` or `useFetch`, which give you status, errors, refresh and key-based caching. Reach for `callOnce` plus `useState` when the data is global, written once and read from many places.
- **Call it directly in setup, a plugin or route middleware.** The payload mechanism depends on it. Calling it from an arbitrary helper outside those contexts, or after an unrelated `await` boundary you introduced, defeats the purpose.
- **State must be JSON-serialisable.** `useState` serialises to JSON, so avoid classes, functions and symbols. Storing a class instance can throw "Cannot stringify arbitrary non-POJOs"; the docs point to a custom serialiser through `definePayloadPlugin` if you truly need it, but a plain object is usually the better answer.
- **Keep the payload small.** Whatever you put in `useState` ships in the HTML. For large objects you do not need to be deeply reactive, the docs show wrapping the initial value in `shallowRef`, which can help performance with big objects and arrays.
- **Don't name your own function `useState`.** The compiler transforms that identifier, and the reference page reserves the name.
- **Keys are global.** Two unrelated features using `"config"` will share state. Namespace them (`"site-config"`, `"checkout-config"`), and put each behind its own composable so the key lives in exactly one file.
- **Invalidation is a separate concern.** The guide names `clearNuxtState` as the utility for globally invalidating cached state. The docs don't describe how it interacts with `callOnce`, so test that combination yourself and decide up front who is responsible for re-initialising the state.

## When the original pattern is still fine

A module-level constant is perfectly safe when it is truly immutable and request-independent: a frozen lookup table, a compiled regular expression, a list of route names. The problem is mutable, per-user or per-request data. Likewise, `onMounted` is the right home for client-only work such as measuring the DOM, starting a `ResizeObserver` or reading `localStorage`, because those things cannot run on the server at all. What it should not be is the first and only place that shared, render-relevant data gets loaded.

A quick review rule that catches most of these: grep your composables for top-level `ref(`, `reactive(` and `new Map(`, then ask of each one whether it can hold anything that differs between two visitors. If yes, move it behind `useState`, and give the one-time initialisation to `callOnce`.

## Sources

- [Nuxt releases on GitHub](https://github.com/nuxt/nuxt/releases)
- [Vue core releases on GitHub](https://github.com/vuejs/core/releases)
- [Vite releases on GitHub](https://github.com/vitejs/vite/releases)
- [Nuxt docs: callOnce](https://nuxt.com/docs/4.x/api/utils/call-once)
- [Nuxt docs: useState](https://nuxt.com/docs/4.x/api/composables/use-state)
- [Nuxt docs: State management](https://nuxt.com/docs/4.x/getting-started/state-management)
