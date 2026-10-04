---
title: "Nuxt pro tip: treat useAsyncData keys as a shared cache contract"
description: "Same key means shared data, error and status refs in Nuxt. Learn which options must match across calls, which may differ, and how dedupe and reactive keys behave."
date: 2026-10-04
tags: [nuxt, pro-tip, data-fetching]
draft: true
---

Nothing substantive shipped in the last 72 hours that we hadn't already covered, so today is a pro tip. It concerns the one thing in Nuxt data fetching that bites teams only after the app grows: **a key is not a label, it is an identity**. Every call with the same key is the same piece of state.

Everything below is checked against the current Nuxt 4 docs on [`useAsyncData`](https://nuxt.com/docs/4.x/api/composables/use-async-data) and [data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching).

## The common mistake

A typical pattern: a shared `'users'` key reused in several components, each with slightly different options because each author tuned it for their own use.

```ts
// components/UserTable.vue
const { data } = await useAsyncData(
  "users",
  () => $fetch("/api/users"),
  { deep: false },
);

// components/UserPicker.vue, written months later
const { data } = await useAsyncData(
  "users",
  () => $fetch("/api/users"),
  { deep: true, transform: (list) => list.map((u) => u.name) },
);
```

It looks harmless. It is not: per the docs, multiple calls with the same key [share the same `data`, `error`, `status` and `pending` refs](https://nuxt.com/docs/4.x/api/composables/use-async-data). There is one piece of state, and two components disagree on what shape it has and how reactive it is.

## What must match, what may differ

The docs split options into two groups for calls that share a key.

Must stay consistent across calls (a mismatch triggers a development warning):

- the `handler`
- `deep`
- `transform`
- `pick`
- `getCachedData`
- `default`

Allowed to differ:

- `server`
- `lazy`
- `immediate`
- `dedupe`
- `watch`

The rule of thumb that falls out of this: **options that change what the data is must match; options that change when it is fetched may vary.** That makes the second list a safe place for per-component tuning, for example one component fetching eagerly and another deferring:

```ts
// Allowed: different timing, same data contract
const { data } = await useAsyncData("users", fetchUsers, { immediate: true });
const { data: sameData, execute } = await useAsyncData("users", fetchUsers, {
  immediate: false,
});
```

## The improved pattern: one composable per key

Because the first group must match, the cleanest fix is to define the key and its data contract exactly once and let components only vary the timing options.

```ts
// app/composables/useUsers.ts
export function useUsers(
  options: { lazy?: boolean; immediate?: boolean } = {},
) {
  return useAsyncData("users", () => $fetch("/api/users"), {
    deep: false,
    ...options,
  });
}
```

```ts
// any component
const { data: users, status } = await useUsers();
const { data: users2 } = await useUsers({ lazy: true });
```

Components that need a derived shape should derive it from `data` with a `computed`, not with a per-call `transform`:

```ts
const { data: users } = await useUsers();
const names = computed(() => users.value?.map((u) => u.name) ?? []);
```

This keeps `transform` out of the shared contract entirely, so a new consumer can't introduce a mismatch.

## Auto-generated keys and `useFetch`

You don't always pick the key yourself. The data fetching guide notes that `useFetch` builds its key from the URL, the fetch options and the call location, so [two identical `useFetch` calls in different components get different keys](https://nuxt.com/docs/4.x/getting-started/data-fetching) and run independently. Likewise, when the first argument to `useAsyncData` is the handler, the key is derived from the source location of the call.

Two consequences:

- If you *want* sharing (one request, one state), pass an explicit key to both calls.
- If you see duplicate requests for what looks like the same endpoint, check whether the keys are actually equal before reaching for caching layers.

The docs also describe `useFetch(url)` as nearly equivalent to `useAsyncData(url, () => event.$fetch(url))`, which is a handy mental model when debugging key collisions.

## Reactive keys beat manual watchers

Keys can be a ref, a computed or a getter, and the data refetches when the key changes. That is usually cleaner than a `watch` array, because the key also names the cache entry:

```ts
const userId = ref("123");

const { data: user } = await useAsyncData(
  computed(() => `user-${userId.value}`),
  () => fetchUser(userId.value),
);

userId.value = "456"; // triggers a refetch under the new key
```

The `watch` option has a caveat spelled out in the guide: watching a reactive value [does not change the URL being fetched](https://nuxt.com/docs/4.x/getting-started/data-fetching). If the URL depends on state, make the URL itself reactive (a computed or getter) instead of only adding the ref to `watch`. You can also opt out of the automatic watching of reactive fetch options with `watch: false`.

## Dedupe and cancellation

`dedupe` accepts `'cancel'` or `'defer'` and defaults to `'cancel'`, according to the [`useAsyncData` reference](https://nuxt.com/docs/4.x/api/composables/use-async-data). It controls what happens when a new execution starts while one is in flight. The handler receives `(nuxtApp, { signal })`, so you can forward the abort signal and make cancellation real instead of just ignoring a stale result:

```ts
const { data, refresh } = await useAsyncData(
  "search",
  (_nuxtApp, { signal }) => $fetch("/api/search", { query: { q: q.value }, signal }),
  { dedupe: "defer" },
);
```

Pick `'cancel'` for search-as-you-type, where only the latest result matters. Pick `'defer'` when a second trigger should reuse the request already running, such as several components calling `refresh` for the same key.

## Trade-offs and caveats

- **A shared key couples components.** That is the point, but it means a change to the handler or `transform` affects every consumer. Centralizing in a composable makes that coupling explicit and reviewable.
- **Warnings are dev-only.** The consistency checks surface as development warnings. Production won't tell you that two components disagree.
- **Keep handlers side-effect free.** The reference warns the handler must be free of side effects so SSR and hydration stay predictable, and points to `callOnce` for side effects. It also says the handler should return a truthy value to avoid client-side duplication.
- **Default caching is narrow.** The default `getCachedData` reads from the payload while hydrating, and from static data otherwise; per the reference this only applies when `experimental.payloadExtraction` is enabled. Don't assume a general-purpose client cache. If you override it, remember `getCachedData` is in the must-match group.
- **Shallow by default.** `deep` defaults to `false`, which the docs note is better for performance. Switching one consumer to `deep: true` is exactly the mismatch described above.
- **Resetting state.** `clear()` sets data and error to `undefined`, status to `idle`, and cancels pending calls, without you needing to know the key.

## When the original pattern is fine

Unique, single-use keys need none of this. A page-level `useFetch` with an auto-generated key and no second consumer has nothing to coordinate. The advice applies once a key crosses a component boundary: from that moment, the key is shared state, and its options are an API.

## Sources

- [useAsyncData reference, Nuxt 4 docs](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [Data fetching guide, Nuxt 4 docs](https://nuxt.com/docs/4.x/getting-started/data-fetching)
