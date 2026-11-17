---
title: "Nuxt pro tip: data from useFetch is a shallowRef, so replace it instead of mutating it"
description: "Since Nuxt 4, data from useAsyncData and useFetch is a shallowRef. In-place edits silently stop updating the UI. Here is the failure, the fix, and when deep: true pays off."
date: 2026-11-17
cover: /images/blog/2026-11-17-nuxt-shallow-data.svg
tags: [nuxt, pro-tip, data-fetching, performance]
draft: false
---

Nothing substantive shipped in the last 72 hours beyond patch and release-candidate builds (Vue is still on 3.6 release candidates, with 3.5.45 the latest stable), so today is a pro tip about a default that bites people migrating from Nuxt 3: the `data` ref returned by your fetching composables is shallow.

## The common mistake

You fetch a list, then edit an item in place after a user action, say toggling a flag for an optimistic update:

```vue
<script setup lang="ts">
const { data: todos } = await useFetch<Todo[]>("/api/todos");

function toggle(id: number) {
    const todo = todos.value?.find((t) => t.id === id);
    if (todo) todo.done = !todo.done; // looks fine, does nothing visible
}
</script>

<template>
    <label v-for="t in todos" :key="t.id">
        <input type="checkbox" :checked="t.done" @change="toggle(t.id)" />
        {{ t.title }}
    </label>
</template>
```

With a deep `ref`, this works. With the current default, the template does not re-render.

## Why it happens

The [Nuxt 4 upgrade guide](https://nuxt.com/docs/4.x/getting-started/upgrade) says `data` from `useAsyncData`, `useFetch`, `useLazyAsyncData` and `useLazyFetch` is now a `shallowRef` rather than a `ref`. Replacing the whole value still triggers updates. Mutating a nested property does not. The stated reason is performance: Vue no longer has to track every nested property and array item, which helps with deeply nested responses. The guide also says `data` should usually be treated as immutable.

The [`useAsyncData` reference](https://nuxt.com/docs/4.x/api/composables/use-async-data) lists the same thing as an option: `deep` defaults to `false` (added in v3.8), returning a shallow ref for performance.

That mutation is silent is the nasty part. The underlying object did change, so a later re-render for an unrelated reason can make the UI look right again, which makes the bug look intermittent.

## The fix: replace, do not mutate

Treat the fetched value as immutable and assign a new one:

```ts
function toggle(id: number) {
    if (!todos.value) return;
    todos.value = todos.value.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}
```

Assigning `todos.value` is a whole-value replacement, which a shallow ref tracks. Only the changed item gets a new identity, so keyed list rendering keeps the other rows stable.

If you need the new data on the server too, do the write through an API call and then call `refresh()` instead of editing a local copy. The local replacement above is for optimistic UI, and you should reconcile it with the server response afterwards.

## Opting in when you really want deep reactivity

If a particular call is consumed by something that edits nested fields in place, such as a form bound with `v-model` to `data.value.profile.name`, opt in for that call only:

```ts
const { data: profile } = await useFetch("/api/profile", { deep: true });
```

The upgrade guide shows this per-call opt-in as the first option. It also documents a project-wide switch, but says it is not recommended:

```ts
export default defineNuxtConfig({
    experimental: {
        defaults: {
            useAsyncData: {
                deep: true,
            },
        },
    },
});
```

The guide also mentions a codemod for migration, `npx codemod@latest nuxt/4/shallow-function-reactivity`. I did not run it, so review what it changes before committing.

## Trade-offs and caveats

**Deep vs shallow is a cost decision.** A deep ref wraps nested objects in reactive proxies and tracks every property read. For a small settings object that cost is irrelevant. For a large list of nested records it is real work on every fetch, on the client and during hydration. That is exactly the case the shallow default targets, so flipping it globally gives that benefit back.

**A better alternative to `deep: true` is often a local copy.** If you need an editable form, copy the data into a local `ref` (or `reactive`) when it arrives and edit that. The fetched value stays an immutable snapshot, and the form state has a clear owner. That also avoids a subtle problem: mutating `data` in place edits the cached object, which other consumers of the same key may be reading.

**Keys that are shared must agree.** The reference notes that `deep` has to match across all `useAsyncData` calls sharing a key, and a mismatch triggers a development warning. If one component needs `deep: true` and another reads the same key shallow, give them different keys or move the editing into a local copy.

**`default` and `clear()` follow the same rule.** The `default` option is a factory that supplies `data` before the call resolves, and `clear()` resets `data` to `default()` when you provided one. Return fresh objects from the factory rather than a shared module-level constant, so one consumer cannot mutate another's initial value.

**Reassignment is still the cheap path.** `refresh()` and `watch: [...]` replace `data` wholesale, which is exactly the update a shallow ref is built for. Your code needs no extra ceremony for server-driven changes. Only client-side in-place edits need attention.

## When the original pattern is still fine

If you have a small, flat response that one component edits and nothing else reads, `deep: true` on that single call is a reasonable, readable choice. The point is to make the choice per call, not to discover it from a UI that stopped updating after an upgrade.

## A quick review checklist

Search your codebase for these shapes after moving to Nuxt 4:

- `data.value.something = ...` or `data.value.items.push(...)` after a fetch
- `v-model` bound to a path inside `data`
- `watch(data, ..., { deep: true })` used to catch nested edits (it will not see them on a shallow ref)

Each one is either a replacement waiting to be written, a local copy waiting to be made, or a call that should say `deep: true` out loud.

## Sources

- [Nuxt: Upgrade Guide (shallow data reactivity)](https://nuxt.com/docs/4.x/getting-started/upgrade)
- [Nuxt: useAsyncData reference](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [Nuxt releases on GitHub](https://github.com/nuxt/nuxt/releases)
- [Vue core releases on GitHub](https://github.com/vuejs/core/releases)
