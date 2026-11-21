---
title: "Nuxt pro tip: after a mutation, refreshNuxtData what is mounted and clearNuxtData what is not"
description: "After a POST, stale useAsyncData caches linger on other pages. How refreshNuxtData, clearNuxtData and useNuxtData split the work, plus the KeepAlive caveat."
date: 2026-11-21
cover: /images/blog/2026-11-21-nuxt-invalidate-after-mutation.svg
tags: [nuxt, pro-tip, data-fetching]
draft: false
---

Nothing stable and substantial shipped in the last 72 hours: Vue is on 3.6.0-rc.16 with 3.5.46 as the latest stable, Vite has an 8.4 beta and patch releases, and Next.js is on 16.5 canaries. So today is a Nuxt tip, and it is about the half of caching that gets less attention than keys: invalidation after a write.

## The common mistake

A form posts a new item, and the author calls `refresh()` on the list that sits on the same page. That works. Then the user navigates to the dashboard, which reads the same data under a different component, and sees the old numbers. Or the author reaches for `window.location.reload()` or `navigateTo(..., { replace: true })` to "force" fresh data, which throws away every cache and all client state to fix one list.

```ts
// app/components/AddTodo.vue
async function add(title: string) {
    await $fetch("/api/todos", { method: "POST", body: { title } });
    // Only the list on THIS page updates. Everything else keeps its stale cache.
    await refreshTodosOnThisPage();
}
```

The problem is that a mutation invalidates data, and the data is keyed, not page-scoped. The key is the unit of invalidation, which is the same contract described in [the earlier post on shared keys](/blog/2026-10-04-nuxt-async-data-shared-keys).

## Three tools, three jobs

According to the [refreshNuxtData docs](https://nuxt.com/docs/4.x/api/utils/refresh-nuxt-data), `refreshNuxtData(keys?)` refetches the `useAsyncData`, `useLazyAsyncData`, `useFetch` and `useLazyFetch` instances that match a key or an array of keys. With no argument it refetches all of them. It returns a promise that resolves when the targeted instances have finished.

The [clearNuxtData docs](https://nuxt.com/docs/4.x/api/utils/clear-nuxt-data) describe a different operation: it clears cached data, error status and pending promises, and the page calls it useful for invalidating data fetching for another page. The signature is `clearNuxtData(keys?: string | string[] | ((key: string) => boolean))`. The predicate form is in the signature, but the page does not explain it, so check the source before relying on it for anything subtle.

The third piece is [useNuxtData](https://nuxt.com/docs/4.x/api/composables/use-nuxt-data), which gives you a reactive ref to the cached value of a keyed fetch. It only works when the original call had an explicit key and the key matches exactly, and the ref can be `undefined`.

The split that follows:

| Situation | Tool |
| --- | --- |
| You hold the `asyncData` instance | its own `refresh()` / `execute()` |
| Another mounted component owns the data | `refreshNuxtData(key)` |
| The data belongs to a page the user is not on | `clearNuxtData(key)` |
| You want the UI to move before the server answers | `useNuxtData(key)` plus a rollback |

The refreshNuxtData page itself says that when you have access to a specific instance, its `refresh` or `execute` is the preferred way. Reach for the global helper only when you do not.

## The improved pattern

Give every list a stable, explicit key, then invalidate by key after the write:

```ts
// app/composables/useTodos.ts
export function useTodos() {
    return useFetch("/api/todos", { key: "todos" });
}
```

```ts
// app/composables/useAddTodo.ts
export function useAddTodo() {
    return async (title: string) => {
        await $fetch("/api/todos", { method: "POST", body: { title } });

        // Mounted consumers (the list beside the form) refetch now.
        await refreshNuxtData("todos");

        // Data the user is NOT looking at: drop it so no page renders a stale copy.
        clearNuxtData("todo-stats");
    };
}
```

`refreshNuxtData` is awaited so a submit button can stay disabled until the list is consistent again. The docs' own example wraps the call in a `refreshing` flag with `try`/`finally` for exactly that.

`clearNuxtData` is synchronous and returns `void`. It does not fetch anything. It removes the cached value, the error and the pending promise, so whichever page owns that key has nothing stale to show. Whether that page then shows a loading state or an empty one depends on how its fetch is written, so give such keys a sensible `default`.

## Optimistic updates, the documented way

For the case where the user should see the change immediately, the `useNuxtData` page describes a five-step flow: read the cache, save a copy, write the new item into the cached list, restore the copy if the request fails, and call `refreshNuxtData` on success to re-sync with the server.

```ts
const { data: todos } = useNuxtData<Todo[]>("todos");

async function add(title: string) {
    const previous = todos.value ? [...todos.value] : undefined;
    todos.value = [...(todos.value ?? []), { id: -1, title }];

    try {
        await $fetch("/api/todos", { method: "POST", body: { title } });
        await refreshNuxtData("todos");
    } catch (error) {
        todos.value = previous;
        throw error;
    }
}
```

Note the guard: the ref is `undefined` when nothing is cached under the key, so the spread has to tolerate that. The temporary `id: -1` is my own placeholder, not from the docs; use whatever your list keys on, and make sure it cannot collide with a real row.

## Trade-offs and caveats

- **Invalidation by string is a convention, not a type.** A typo in `"todos"` fails silently: nothing matches, nothing refetches. Export the keys as constants from one module, as you would for any shared cache contract.
- **`refreshNuxtData()` with no arguments is a blunt tool.** It refetches every `useAsyncData` and `useFetch` key. That is acceptable after a login or tenant switch and wasteful after adding one todo.
- **`<KeepAlive>` changes the picture.** The docs note that components cached by `<KeepAlive>` and deactivated still refetch their `asyncData` on `refreshNuxtData` until they are unmounted. A hidden tab can therefore spend a request on every global refresh.
- **Refreshing is not cancelling.** `refresh` by default will not start again until the current one finishes, and its `dedupe` option defaults to `'cancel'` according to the [useAsyncData docs](https://nuxt.com/docs/4.x/api/composables/use-async-data). Two quick mutations in a row can cancel the first refetch in flight, which is usually what you want, provided your handler forwards the `signal` to `$fetch`.
- **Server data is still the source of truth.** Optimistic state is a guess. Always finish with a refetch, as the flow above does, so a server-side rule that rewrote the item wins.

## When the original pattern is fine

If a mutation affects exactly one list and that list is the component the user is looking at, calling its own `refresh()` is simpler and needs no key discipline at all. Move to key-based invalidation when two or more consumers read the same data, which in practice means the moment a dashboard, a count in the header or a detail page shares a resource with a list.

## Sources

- [refreshNuxtData, Nuxt docs](https://nuxt.com/docs/4.x/api/utils/refresh-nuxt-data)
- [clearNuxtData, Nuxt docs](https://nuxt.com/docs/4.x/api/utils/clear-nuxt-data)
- [useNuxtData, Nuxt docs](https://nuxt.com/docs/4.x/api/composables/use-nuxt-data)
- [useAsyncData, Nuxt docs](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
- [Next.js releases](https://github.com/vercel/next.js/releases)
- [Nuxt releases](https://github.com/nuxt/nuxt/releases)
- [Node.js blog](https://nodejs.org/en/blog)
