---
title: "Next.js pro tip: metadata merges shallowly, so a nested openGraph silently drops your inherited fields"
description: "Next.js merges metadata objects shallowly: set openGraph in a page and everything from the layout is gone. How to share fields safely and stop losing og tags."
date: 2026-10-30
cover: /images/blog/2026-10-30-nextjs-metadata-shallow-merge.svg
tags: [next.js, pro-tip, seo]
draft: false
---

A common SEO regression in App Router projects looks like this: the root layout defines a tidy `openGraph` block with a site name, a locale and a default image. A page then sets its own `openGraph.title`. The page title is right, and every share preview on that route has lost its image, its site name and its locale. Nothing errors, and the type checker is happy.

The cause is a documented rule that is easy to read past: metadata is merged **shallowly**.

## The rule

The [`generateMetadata` reference](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) says metadata is evaluated from the root segment down to the segment closest to the final `page.js`. The objects exported along the way are then merged shallowly, and duplicate keys are replaced based on that order. "Shallow" is the part that matters. Top-level keys such as `title`, `openGraph` and `robots` are the unit of replacement. If a later segment defines `openGraph`, the whole object from the earlier segment is discarded, not merged field by field.

The docs show it with a small example. The layout defines `openGraph` with a title and a description, and `app/blog/page.js` defines `openGraph` with only a title. The output has the blog title and no `openGraph.description`. The inverse also holds: if the page does not set `openGraph` at all, every field from the layout is inherited.

So the failure is partial overrides. The moment you touch a nested object, you own all of it.

## The problematic pattern

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
    metadataBase: new URL("https://acme.com"),
    title: { template: "%s | Acme", default: "Acme" },
    openGraph: {
        siteName: "Acme",
        locale: "en_US",
        type: "website",
        images: ["/og-default.png"],
    },
};
```

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);

    return {
        title: post.title,
        openGraph: {
            title: post.title, // looks harmless
        },
    };
}
```

The `<title>` is fine, because `title` is replaced and the layout template still applies to it. But `openGraph` was replaced wholesale: `og:site_name`, `og:locale`, `og:type` and the default `og:image` from the layout are not in the output. A social crawler now sees a bare `og:title`.

`title.template` follows its own rules, which the docs spell out: it applies to child segments only, not to the segment that defines it, and `title.default` is required next to it. Do not confuse that with the shallow-merge behaviour; they are separate mechanisms.

## Fix 1: share the nested object explicitly

The docs' own recommendation is to pull the shared fields into a variable and spread it where you override:

```ts
// app/shared-metadata.ts
export const baseOpenGraph = {
    siteName: "Acme",
    locale: "en_US",
    type: "website",
    images: ["/og-default.png"],
} as const;
```

```tsx
// app/layout.tsx
import { baseOpenGraph } from "./shared-metadata";

export const metadata: Metadata = {
    metadataBase: new URL("https://acme.com"),
    openGraph: baseOpenGraph,
};
```

```tsx
// app/blog/[slug]/page.tsx
return {
    title: post.title,
    openGraph: {
        ...baseOpenGraph,
        title: post.title,
        type: "article",
        publishedTime: post.date.toISOString(),
    },
};
```

This is explicit, greppable and survives refactors. The cost is that every page that overrides `openGraph` must remember the spread. A tiny helper makes that harder to forget:

```ts
import type { Metadata } from "next";

export function withOpenGraph(og: NonNullable<Metadata["openGraph"]>): Metadata["openGraph"] {
    return { ...baseOpenGraph, ...og };
}
```

One caveat: spreading is itself shallow. If you override `images`, you replace the whole array. That is usually what you want for a page-specific image.

## Fix 2: extend the parent via `parent`

When the value you want to extend comes from a layout and you are already inside `generateMetadata`, the second argument is a promise of the resolved parent metadata. The docs use it to extend rather than replace images:

```tsx
import type { Metadata, ResolvingMetadata } from "next";

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);
    const previousImages = (await parent).openGraph?.images || [];

    return {
        title: post.title,
        openGraph: {
            images: [post.cover, ...previousImages],
        },
    };
}
```

This keeps the parent's images, but note that the returned `openGraph` is still a replacement for everything else the parent had. `parent` solves "append to an array"; it does not turn the merge into a deep one. Spread the parent's `openGraph` yourself if you want the other fields:

```tsx
const parentOg = (await parent).openGraph ?? {};
return {
    openGraph: { ...parentOg, title: post.title, images: [post.cover, ...(parentOg.images ?? [])] },
};
```

Awaiting `parent` also makes your metadata depend on the parent's resolution, so only reach for it when you actually need the parent's value. For fixed site-wide defaults a shared constant is simpler and has no ordering dependency.

## Related metadata behaviour worth knowing

- **Static vs dynamic.** The docs say metadata that does not depend on request information should use the static `metadata` object rather than `generateMetadata`. You also cannot export both from the same segment.
- **File-based metadata wins.** Files such as `opengraph-image` have higher priority than the `metadata` object and `generateMetadata`. If an `openGraph` image seems to be ignored, check for a file convention in the segment first.
- **Relative URLs need `metadataBase`.** A relative path in a URL-based field without `metadataBase` is a build error. An absolute URL in the field makes `metadataBase` irrelevant for that field. Fields like `openGraph.images` accept relative paths once `metadataBase` is set at the root.
- **Memoization.** `fetch` calls inside `generateMetadata` are memoized across `generateMetadata`, `generateStaticParams`, layouts, pages and Server Components, and React `cache` covers cases where `fetch` is unavailable. Calling your data loader in both the page and `generateMetadata` does not double the request when it goes through one of those.
- **Cache Components.** With Cache Components enabled, metadata that reads `cookies()`, `headers()`, `params` or `searchParams`, or does uncached fetching, defers to request time. If the rest of the page is fully prerenderable, Next.js raises an error and asks you to either cache the data with `'use cache'` or add an explicit dynamic marker. Also, a `'use cache'` `generateMetadata` must return serializable values, so a `URL` instance such as `metadataBase` must be returned as a string.
- **Streaming.** Since v15.2.0 dynamic metadata can stream after the initial UI. HTML-limited bots such as `facebookexternalhit` still get blocking metadata in `<head>`, so share previews are not affected by streaming. `htmlLimitedBots` can override the detection list; the docs warn that forcing it for all agents can lengthen response times.

## How to catch it

A shallow-merge bug is invisible in the UI. Check the output instead. A quick script against a built or running app:

```bash
curl -s -A "facebookexternalhit/1.1" https://acme.com/blog/some-post \
  | grep -oE '<meta property="(og|article):[^"]+"[^>]*>'
```

Using the HTML-limited bot user agent matters, because that is the response where the tags are guaranteed to be in `<head>` rather than appended later. Assert the presence of `og:site_name`, `og:image` and `og:locale` for one route of each template in an end-to-end test, and the regression stops being silent.

## When the original pattern is fine

If a page genuinely wants a clean slate, such as a landing page with a completely different share card, replacing `openGraph` is exactly right. And for pages that set only `title` and `description`, you get full inheritance for free, so there is nothing to do. The trap is the middle case: overriding one nested field while expecting the rest to survive.

## Takeaways

- Treat every nested metadata object (`openGraph`, `twitter`, `robots`, `alternates`) as owned by the last segment that sets it.
- Put shared fields in one exported constant and spread it wherever you override.
- Use `parent` to append to inherited arrays, and spread the parent's object when you need its other fields.
- Verify with a request that identifies as an HTML-limited bot, not by looking at the page.

## Sources

- [generateMetadata (Next.js docs)](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [generateMetadata: streaming metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#streaming-metadata)
