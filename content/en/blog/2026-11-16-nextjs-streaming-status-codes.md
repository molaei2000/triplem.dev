---
title: "Next.js pro tip: run notFound() before the Suspense boundary, or your 404 ships as a 200"
description: "Once a Suspense fallback streams, the HTTP status is fixed at 200. Put the existence check before the boundary, or use Proxy, so missing pages return a real 404."
date: 2026-11-16
cover: /images/blog/2026-11-16-nextjs-streaming-status-codes.svg
tags: [next.js, pro-tip, seo]
draft: false
---

Streaming is the default way to make a slow page feel fast: send the shell, then fill in the rest as data resolves. The cost is easy to miss. Headers go out with the first chunk, so the status code is decided before most of your page has rendered. A `notFound()` that runs later cannot turn the response into a 404.

This post checks the behavior against the current Next.js docs: the [Streaming guide](https://nextjs.org/docs/app/guides/streaming) and the [`loading.js` reference](https://nextjs.org/docs/app/api-reference/file-conventions/loading), both last updated 2026-11-06.

## The common mistake

A dynamic route that fetches content inside a Suspense boundary and calls `notFound()` from there:

```tsx title="app/post/[slug]/page.tsx"
import { Suspense } from "react";
import { PostContent } from "./post-content";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<p>Loading post...</p>}>
      {/* PostContent fetches the post and calls notFound() if it is missing */}
      <PostContent slug={slug} />
    </Suspense>
  );
}
```

For a slug that does not exist, the browser shows your not-found UI, so manual testing looks fine. The response underneath is a different story.

## Why it happens

The streaming guide states the constraint plainly: once streaming begins, the status code and headers have been sent and cannot change. A rendered Suspense fallback, or a component suspending under a boundary, is what starts the stream. The response commits to `200 OK` at that point.

What Next.js does instead of a status change:

- A `notFound()` fired mid-stream renders the not-found UI and injects `<meta name="robots" content="noindex">` into the streamed HTML, so search engines should not index the URL.
- A `redirect()` mid-stream becomes a client-side redirect, not an HTTP redirect header.
- An error thrown after streaming started is caught by the nearest `error.js` boundary and replaces only the failed section. The status stays `200`.

The docs also note that some crawlers may label these responses "soft 404s", and that the `noindex` tag keeps them out of search results. So search indexing is mostly protected. What you lose is the correct status for everything that reads status codes: uptime monitors, link checkers, analytics, CDN caching rules, API consumers, and compliance requirements.

## The fix: check before the boundary

Run a cheap existence check and call `notFound()` before any fallback renders:

```tsx title="app/post/[slug]/page.tsx"
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PostContent } from "./post-content";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exists = await checkSlugExists(slug); // fast existence check
  if (!exists) notFound(); // 404 before streaming starts

  return (
    <Suspense fallback={<p>Loading post...</p>}>
      <PostContent slug={slug} />
    </Suspense>
  );
}
```

This is the pattern the guide shows. The rule it encodes: without Cache Components, if neither a `loading.js` nor a `<Suspense>` has started the response, Next.js can still return a `404`, `403` or `401` when the matching interrupt runs.

The check has to be fast. It now blocks the first byte, which is exactly the cost streaming was meant to avoid. Look up a slug in an index, not the full article.

## Watch out for `loading.js`

`loading.js` is a Suspense boundary you did not write. Per the reference, it wraps `page.js`, `not-found.js` and nested layouts in the segment. Adding one next to the page above means the fallback renders before your page function reaches `notFound()`, and the status is back to `200`. Dropping in a `loading.js` can therefore silently change status behavior for every dynamic route beneath it.

Related, from the same page: a layout that reads uncached or runtime data such as `cookies()` or `headers()` does not fall back to a same-segment `loading.js`. Without Cache Components, navigation blocks until the layout finishes. With Cache Components, you get a build-time error telling you to add a `<Suspense>`. The docs recommend placing `<Suspense>` close to the runtime data access rather than relying on a high-level `loading.js`.

## With Cache Components, the shell goes first

The rule changes when Cache Components is enabled. Next.js sends the prerendered shell first, with headers that preload CSS, fonts and images. Sending the shell starts the response with `200`, even when the shell has no visible UI, and even when the route sets `instant = false`.

A request-time check inside the page runs after that, so the status stays `200`, though `notFound()` still renders the not-found UI and adds `noindex`. The docs say an interrupt can keep its status only when it runs during prerendering, before the response begins.

For a real request-time 404 in that setup, use [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy). It runs before the page renders and can redirect, rewrite, or return a response. The loading reference suggests checking the slug there, then rewriting to a not-found route or returning a 404 response, and keeping the check light: avoid fetching full content in Proxy. Redirects in `next.config.js` also run before rendering.

See the [Proxy reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) for the current API; this post only relies on the behavior the streaming docs describe.

## Bots get a different response entirely

One more detail that matters for SEO testing. Bots and crawlers are served differently from browsers: HTML-limited bots such as Twitterbot get `generateMetadata` resolved before the page streams, so metadata lands in the initial `<head>`. The streaming guide shows that a request with a bot user agent blocks until the full render completes and then delivers one document. If you debug status codes with `curl`, remember that your result may not match what a browser sees, and use a script that reads the stream if you need chunk timings.

## Trade-offs

- **Pre-boundary check:** correct status, but it adds latency before the first byte. Worth it for routes where missing content is common (user-typed slugs, expired items).
- **Proxy:** cheapest place for a hard 404, but it adds a second lookup and a second place to keep in sync with the data layer.
- **Doing nothing:** acceptable when the `noindex` tag is enough and nobody downstream reads status codes. For a site with real SEO or monitoring requirements, it usually is not.

Keep the original pattern when the not-found decision genuinely depends on slow data and you accept a `200`. Just make that decision on purpose.

## Sources

- https://nextjs.org/docs/app/guides/streaming
- https://nextjs.org/docs/app/api-reference/file-conventions/loading
- https://nextjs.org/docs/app/getting-started/fetching-data
