---
title: "Next.js pro tip: with Cache Components, generateStaticParams is a build-time test suite, so feed it real samples"
description: "With Cache Components, an empty generateStaticParams fails the build. Samples are what validate your route, and conditional branches they skip still fail at runtime."
date: 2026-11-22
cover: /images/blog/2026-11-22-nextjs-generate-static-params-cache-components.svg
tags: [next.js, pro-tip, caching]
draft: false
---

Nothing stable and substantive shipped in the last 72 hours that we haven't already covered. Vue is still on 3.6 release candidates ([rc.16 is the newest](https://github.com/vuejs/core/releases)), Vite's newest line is an [8.4 beta](https://github.com/vitejs/vite/releases), and the rest are patches. So today is a pro tip, and since the previous one was about Nuxt, it is Next.js's turn. Everything below was checked against the current [`generateStaticParams` reference](https://nextjs.org/docs/app/api-reference/functions/generate-static-params), the [empty `generateStaticParams` error page](https://nextjs.org/docs/messages/empty-generate-static-params) and the [dynamic segments reference](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes).

The tip: **with Cache Components, `generateStaticParams` stops being only a list of pages to prerender. It becomes the input to build-time validation of your route. Treat the samples you return as test cases, and know exactly what they do not cover.**

## The habit that breaks

Without Cache Components, returning an empty array is a documented and useful pattern. The reference says to return `[]` to render every path the first time it is visited, and that you must always return an array, because otherwise the route is rendered dynamically.

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
    return []; // "render everything on first visit"
}
```

Carry that habit into a project with Cache Components enabled and the build fails. The docs state that dynamic routes must return **at least one param** there, and an empty array is a [build error](https://nextjs.org/docs/messages/empty-generate-static-params).

The reason is not pedantry. During the build, Next.js runs your route once per sample param and checks that nothing reads runtime data (`cookies()`, `headers()`, `searchParams`) outside a `<Suspense>` boundary or a `use cache` scope. With no samples there is nothing to run, so there is nothing to validate. The error page lists exactly that as the point: catch runtime-access mistakes at build time, not in production.

## What the samples buy you

Per the dynamic segments reference, the behaviour splits on whether you provide samples.

Without `generateStaticParams`, params are runtime data. Every access to them has to sit under a Suspense fallback, and Next.js builds a static shell and fills in the content per request. In layouts, the docs advise not awaiting `params` at the top level, because that stops the layout from being prerendered; pass the promise down and await it where it is used.

With `generateStaticParams`, the route is executed with each sample at build time, the HTML is collected, and a mistake fails the build. Pages for params you did not list are rendered on first request and saved to disk after that request succeeds.

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
    return [{ slug: "hello-world" }, { slug: "getting-started" }];
}

export default async function Page({ params }: PageProps<"/blog/[slug]">) {
    const { slug } = await params;
    return <Content slug={slug} />;
}

async function Content({ slug }: { slug: string }) {
    const post = await getPost(slug);
    return <article>{post.title}</article>;
}

async function getPost(slug: string) {
    "use cache";
    const res = await fetch(`https://api.example.com/posts/${slug}`);
    return res.json();
}
```

Here `getPost` is cached, `params` is resolved from known values, and the build proves the page can be prerendered. That is the intended shape: samples give you both instant pages for the popular routes and a validated route structure.

## The gap: branches your samples never take

Build-time validation covers only the code paths the samples actually execute. The docs are explicit about this, and it is where the real production bugs live.

```tsx
import { cookies } from "next/headers";

export async function generateStaticParams() {
    return [{ slug: "public-post" }, { slug: "hello-world" }];
}

export default async function Page({ params }: PageProps<"/blog/[slug]">) {
    const { slug } = await params;

    if (slug.startsWith("private-")) {
        // never executed at build time
        return <PrivatePost slug={slug} />;
    }
    return <PublicPost slug={slug} />;
}

async function PrivatePost({ slug }: { slug: string }) {
    const token = (await cookies()).get("token");
    // ...
}
```

The build passes, because neither sample takes the `private-` branch. A request for `/blog/private-notes` is validated on first request instead, finds `cookies()` read without a Suspense boundary, and errors. Other runtime slugs that avoid the branch render fine and get saved, so the failure looks intermittent from the outside.

The documented fix is to wrap the runtime-reading component in Suspense:

```tsx
import { Suspense } from "react";

if (slug.startsWith("private-")) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrivatePost slug={slug} />
        </Suspense>
    );
}
```

A practical rule that follows from this: **include at least one sample per branch.** If your page forks on a slug prefix, a locale, or a content type, add a representative param for each fork. Then the build exercises it, and the failure moves from a runtime error to a failed CI run.

## Don't reach for the placeholder

The docs mention an escape hatch for when you truly don't know any values at build time: return a placeholder such as `[{ slug: "__placeholder__" }]` and call `notFound()` for it in the page. They also say this defeats the purpose, since it only validates one code path, and that real params may then hit paths that access dynamic APIs incorrectly, producing runtime errors that error boundaries can't catch. Use it only when you have no better option, and prefer pulling real slugs from your CMS or content layer even if you slice the list.

Slicing is fine, by the way. Returning the top ten posts is still a valid sample set; the rest render on first request. Just keep the branch-coverage rule above in mind when choosing which ten.

## Other details worth knowing

- **`dynamicParams` does not apply.** The reference says the option is available only without Cache Components. If you relied on `export const dynamicParams = false` to 404 unknown slugs, validate the param in the page instead and call `notFound()`; the dynamic segments docs show an `assertValidLocale` pattern for exactly this.
- **Parents feed children.** A child `generateStaticParams` runs once per set of params the parent returns and receives the parent's params synchronously. A layout can only generate params for segments at or above itself.
- **Not called on revalidation.** During ISR-style revalidation, `generateStaticParams` is not called again, and in `next dev` it runs when you navigate to the route.
- **Route Handlers too.** The same function works on `route.ts`, and the docs show combining it with `use cache` for static API responses.
- **`fetch` is memoized** across `generate`-prefixed functions, layouts and pages, so fetching the same list in several places during the build does not multiply requests. If you read from a database instead, wrap the read in React's `cache`.

## Trade-offs

The requirement costs you something. Sites whose content is entirely unknown at build time, or whose builds can't reach the data source, now have to supply some real sample or fall back to the placeholder and lose most of the validation. Build time also grows with the number of samples, since each one is a full route execution.

In return, a whole class of "works for the slugs I tried, throws for one in production" bugs becomes a build failure. For a content-heavy route that is a good trade. For a route that is truly per-request, with no meaningful static variants, the better design may be to skip `generateStaticParams` and put the Suspense boundaries around `params` access, as the docs describe for that case.

## Checklist

1. Return real params, never `[]`, from every dynamic route when Cache Components is on.
2. Add one sample for each branch that behaves differently.
3. Wrap anything that reads `cookies()`, `headers()` or `searchParams` in Suspense, including branches your samples don't reach.
4. Replace `dynamicParams = false` with explicit validation and `notFound()`.
5. Treat a placeholder param as technical debt.

## Sources

- [generateStaticParams reference](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [Empty generateStaticParams with Cache Components](https://nextjs.org/docs/messages/empty-generate-static-params)
- [Dynamic Route Segments reference](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
