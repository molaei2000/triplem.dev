---
title: "Nuxt pro tip: list pages in Nuxt Content should select() their fields and index what they filter on"
description: "Nuxt Content list pages that fetch whole documents do more work than they need. Use select(), where() and collection indexes to keep queries narrow."
date: 2026-10-31
cover: /images/blog/2026-10-31-nuxt-content-select-indexes.svg
tags: [nuxt, pro-tip, nuxt-content, performance]
draft: false
---

Nothing in the last 72 hours was substantive enough to carry a post: the only fresh releases were release candidates (Vue 3.6.0-rc.14 on 30 Oct, Nitro v3's RC on 29 Oct), and this blog doesn't write about RCs. The previous pro tip was about Next.js, so today is Nuxt, and the topic is the one query pattern content sites get wrong most often: the list page.

Everything below was checked against the [`queryCollection` reference](https://content.nuxt.com/docs/utils/query-collection) and the [`defineCollection` reference](https://content.nuxt.com/docs/collections/define).

## The common mistake

A blog index needs a title, a date and a path per post. The lazy query asks for the whole document:

```ts
// pages/blog/index.vue
const { data: posts } = await useAsyncData("blog-list", () =>
    queryCollection("blog").order("date", "DESC").all(),
);
```

Nothing in that query limits the fields, so each entry comes back as a full record. Whatever you return from `useAsyncData` is also what ends up serialized into the SSR payload on the client-bound page (the previous [payload pruning tip](/blog/2026-10-28-nuxt-payload-pick-transform) covers that side). The query doesn't know your template only reads three fields, so you have to tell it.

## Project at the query, not in the component

`select()` limits the returned fields. It takes a list of field names, and the fields you name are the ones you get back:

```ts
const { data: posts } = await useAsyncData("blog-list", () =>
    queryCollection("blog")
        .where("draft", "=", false)
        .select("title", "path", "date", "description")
        .order("date", "DESC")
        .all(),
);
```

Compared with trimming in `pick` or `transform` afterwards, this moves the narrowing to the source. The query returns less, so there's less to serialize, and the list item only carries the fields you asked for. One caveat from the docs: the reference doesn't say anything about how much `select` shrinks the body or payload, so measure your own responses instead of assuming a number.

Put `select()` on every list, nav and "related posts" query. Keep full-document fetches for the single `path(route.path).first()` call on the post page, where you do render the body.

## Filter in the query

The builder composes conditions with AND by default, and `andWhere` / `orWhere` take a callback for grouped conditions:

```ts
const { data: recent } = await useAsyncData(
    () => `blog-tag-${tag.value}`,
    () =>
        queryCollection("blog")
            .where("draft", "=", false)
            .andWhere((q) => q.where("date", ">", "2026-01-01").where("tags", "LIKE", `%${tag.value}%`))
            .select("title", "path", "date")
            .order("date", "DESC")
            .limit(10)
            .all(),
    { watch: [tag] },
);
```

The documented operators are `=`, `>`, `<`, `<>`, `IN`, `BETWEEN`, `NOT BETWEEN`, `IS NULL`, `IS NOT NULL`, `LIKE` and `NOT LIKE`. Use `limit()` and `skip()` for paging rather than fetching all rows and slicing in a computed. When you only need a total, `count()` respects earlier `where` conditions and returns the number directly, so you don't load rows to call `.length` on them.

Note the key: it is a function that includes the tag. A static key shared by queries with different filters is the cache-collision trap from the [shared keys post](/blog/2026-10-04-nuxt-async-data-shared-keys).

## Index the columns you filter and sort on

`defineCollection` accepts an `indexes` array. Each index needs `columns`, may be `unique` (default `false`) and may have a `name`; without one it is auto-named `idx_{collection}_{column1}_{column2}`. The docs say indexes are created automatically when the database schema is generated, and are supported on SQLite, Cloudflare D1, PostgreSQL, LibSQL and PGlite.

```ts
// content.config.ts
import { defineCollection, defineContentConfig } from "@nuxt/content";
import { z } from "zod";

export default defineContentConfig({
    collections: {
        blog: defineCollection({
            type: "page",
            source: "blog/**/*.md",
            schema: z.object({
                date: z.date(),
                draft: z.boolean().default(false),
                tags: z.array(z.string()).default([]),
            }),
            indexes: [{ columns: ["draft", "date"] }],
        }),
    },
});
```

The docs recommend indexing columns used in `where()` and sorting, and composite indexes for multi-column queries. The `draft` + `date` pair above matches the list query: filter on one, order by the other.

## Trade-offs

- **Small sites won't notice.** For a few dozen posts on local SQLite the indexes are cheap insurance, not a measured win. The docs give no benchmark, so don't present one. The documented concrete benefit is on Cloudflare D1: an indexed `WHERE` with a single match counts as one row read, while an unindexed one counts every scanned row, which affects billing.
- **`select()` is a contract.** If a component later needs `description`, the field must be added to the query; forgetting it means that field is simply not there. Keep the field list next to the component that renders it, or wrap it in a small composable.
- **`LIKE` on a JSON-ish array column is a blunt tool.** It works for simple tag matching but is not an index-friendly lookup. If tag filtering is central, consider whether a dedicated structure fits better, and verify behavior against your database before relying on it.
- **Don't let collections overlap.** The docs warn that a file belonging to several collections can break live reload; use `exclude` patterns.

## When the original pattern is fine

Fetching full documents is correct on the post page itself, and on a tiny internal site where the list is already a handful of rows. The mistake is applying that default to every query, including the ones that run on every index, tag and navigation render.

## Sources

- [queryCollection | Nuxt Content](https://content.nuxt.com/docs/utils/query-collection)
- [defineCollection | Nuxt Content](https://content.nuxt.com/docs/collections/define)
- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [nitrojs/nitro releases](https://github.com/nitrojs/nitro/releases)
