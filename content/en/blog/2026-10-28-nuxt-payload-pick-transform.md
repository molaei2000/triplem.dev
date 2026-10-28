---
title: "Nuxt pro tip: trim the SSR payload with pick, transform and serialize: false"
description: "Every useAsyncData result lands in the HTML payload. How pick, transform and the v4.6 serialize option shrink it, what they do not save, and where each one bites."
date: 2026-10-28
cover: /images/blog/2026-10-28-nuxt-payload-pick-transform.svg
tags: [nuxt, pro-tip, data-fetching, performance]
draft: false
---

Nothing released in the last 72 hours was substantive enough to carry a post. Nuxt 4.6.3 is already covered in an earlier post, Vue 3.6 is still shipping release candidates, and the newest Next.js stable, 16.4.3, is a bug-fix backport from five days ago. The last pro tip was about Next.js, so today's is Nuxt: what your data fetching puts into the HTML.

Everything below was checked against the [`useAsyncData` reference](https://nuxt.com/docs/4.x/api/composables/use-async-data) and the [data fetching guide](https://nuxt.com/docs/4.x/getting-started/data-fetching).

## The common mistake

You fetch a full record from your API and render three fields of it. It works, so nobody looks at the HTML. But by default the resolved data is stored in the Nuxt payload (`__NUXT_DATA__`), which is how the client avoids refetching during hydration. The data guide is blunt about the consequence: large responses make the page bigger. Whatever the handler returns, rendered or not, ships to the browser.

```vue
<script setup lang="ts">
// The endpoint returns the whole record: body, revisions, author profile, flags...
const { data: article } = await useFetch(`/api/articles/${useRoute().params.slug}`);
</script>

<template>
    <h1>{{ article?.title }}</h1>
    <p>{{ article?.summary }}</p>
</template>
```

Two fields are rendered. Everything else is serialized into the document, parsed by the browser, and kept in memory for the life of the page.

## Improved pattern 1: `pick`

`pick` keeps only the listed keys from the result. The guide's example uses it on `useFetch` with a list of field names that the template actually uses.

```vue
<script setup lang="ts">
const { data: article } = await useFetch(`/api/articles/${useRoute().params.slug}`, {
    pick: ["title", "summary"],
});
</script>
```

The reference page describes `pick` only as keeping specified keys from the result. It gives no further detail, so I would not assume anything about nested paths. Test your own shape and inspect the output.

## Improved pattern 2: `transform`

`transform` receives the resolved result and returns what gets stored. That is the tool for lists, where you want to reshape every item:

```ts
const { data: articles } = await useFetch("/api/articles", {
    transform: (list) => list.map((a) => ({ title: a.title, slug: a.slug })),
});
```

This mirrors the guide's own `map` example. `transform` can also be async according to the reference, which types it as returning `DataT` or a promise of it.

## What neither one saves

Both options only affect the payload. The guide says they prevent unwanted data from being added to the payload transferred from server to client, and the request itself is unchanged. The server still downloads and parses the full response. If the real cost is the upstream call, fix it at the source: a narrower endpoint, a query parameter, or a server route that returns just the fields you need.

## `serialize: false` (v4.6+)

The reference lists a `serialize` option, default `true`, marked as available from v4.6. With `serialize: false`, data fetched on the server is kept out of the payload entirely. The client fetches it again after hydration if a component renders it. The docs suggest pairing it with lazy hydration to avoid hydration mismatches and extra client fetches.

```ts
const { data: recommendations } = await useAsyncData(
    "recommendations",
    (_nuxtApp, { signal }) => $fetch("/api/recommendations", { signal }),
    { serialize: false },
);
```

This is a different trade. `pick` and `transform` still avoid a client refetch. `serialize: false` removes the data from the HTML and pays for it with a second request. It makes sense for large, non-critical data that you do not want in the document. It is a poor fit for anything above the fold, where the extra round trip would show up as a late render or a mismatch. I have not measured it, and the docs do not discuss payload size for this option, so measure before you adopt it.

## Keep options consistent across calls

The reference says options such as `handler`, `deep`, `transform`, `pick`, `getCachedData`, `default` and `middleware` must match across every `useAsyncData` call that shares a key, and a mismatch triggers a development warning. This matters here: if one component picks two fields and another calls the same key without `pick`, they are fighting over one cache entry. Either share the key and the options through a composable, or use different keys. This continues the point of an [earlier post on keys as a shared cache contract](/blog/2026-10-04-nuxt-async-data-shared-keys).

```ts
// composables/useArticleCard.ts
export function useArticleCard(slug: MaybeRefOrGetter<string>) {
    return useFetch(() => `/api/articles/${toValue(slug)}`, {
        key: () => `article-card:${toValue(slug)}`,
        pick: ["title", "summary"],
    });
}
```

The `key` option and the getter URL are standard `useFetch` usage. The composable is my illustration, not a pattern from the docs.

## How to see the problem

The guide points at the Payload tab in Nuxt DevTools. The payload is the object available through `useNuxtApp().payload`, so you can also inspect it in the console. Compare what is in there against what the template reads. For a rough size check, view the page source and look at the `__NUXT_DATA__` script block.

## Trade-offs and caveats

- **Types.** If you reshape data with `transform`, the type of `data` follows the return value. Components that expect the full record will fail to type check, which is a feature. It forces you to see who depends on the dropped fields.
- **Shared keys.** As above, mismatched options on a shared key warn in development. Treat that warning as a real bug, not noise.
- **`getCachedData`.** Per the reference, the default only serves cached data when `experimental.payloadExtraction` is enabled, and otherwise reads from the hydration payload. Trimming the payload also trims what hydration can reuse, so anything you drop must not be needed by a client-side navigation that expects the full record.
- **Premature trimming.** A 2 KB record does not need this. Start with the endpoints that return the largest bodies, or lists rendered on many pages.
- **Overfetching stays.** If your API returns far more than the page needs, the payload trick hides the symptom on the wire to the browser but not on the server.

## When the original pattern is fine

If you render most of the response, or it is small, the defaults are right. Hydration reuse is the point of the payload, and fighting it with `serialize: false` on above-the-fold data trades a bigger document for a slower page. Use `pick` and `transform` by default for big records, and keep `serialize: false` for data that is large and genuinely secondary.

## Sources

- [Nuxt docs: `useAsyncData`](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [Nuxt docs: Data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)
- [Nuxt releases](https://github.com/nuxt/nuxt/releases)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Next.js releases](https://github.com/vercel/next.js/releases)
