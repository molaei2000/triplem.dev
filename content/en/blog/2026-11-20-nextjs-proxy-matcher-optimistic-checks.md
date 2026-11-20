---
title: "Next.js pro tip: treat proxy.ts as an optimistic gate, and scope its matcher on purpose"
description: "proxy.ts runs on every request unless you add a matcher, and it can't cache fetches or replace auth checks. Scope it, forward headers correctly, keep it cheap."
date: 2026-11-20
cover: /images/blog/2026-11-20-nextjs-proxy-matcher-optimistic-checks.svg
tags: [next.js, pro-tip, security, performance]
draft: false
---

Nothing stable and substantive landed in the last 72 hours that we haven't covered. Vue is still on 3.6 release candidates (rc.15 is the newest), Vite's newest line is a 8.4 beta, and the rest is patch releases, which we skip. So today is a pro tip, and since the last one was Nuxt, it's Next.js's turn. Everything below was checked against the current [proxy.js reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) and the [Proxy getting-started page](https://nextjs.org/docs/app/getting-started/proxy).

The tip: **`proxy.ts` (the Next.js 16 name for middleware) is a fast, optimistic gate in front of your app. It is invoked for every route unless you scope it, it can't cache what it fetches, and it is not an authorization layer.** Most proxy bugs come from forgetting one of those three.

## Mistake 1: no matcher

Without a `matcher`, the docs say Proxy runs on every request, including `_next/static`, `_next/image` and everything in `public/`. An auth redirect written without a matcher therefore also redirects your CSS, JS and images for logged-out visitors.

```ts
// proxy.ts: runs for everything, including static assets
export function proxy(request: NextRequest) {
    if (!request.cookies.has("session")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }
}
```

Scope it. The reference's negative-lookahead pattern is the usual starting point:

```ts
export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
```

Two details from the docs worth remembering. Matcher values must be constants so they can be analysed at build time; variables are ignored. And even if you exclude `_next/data` in a negative pattern, Proxy still runs for those routes. That is intentional, so you can't protect a page and forget its data route.

You can also skip prefetches with `has`/`missing` conditions on the `next-router-prefetch` and `purpose` headers, using object-form matchers. That's useful when a check is expensive and a prefetch shouldn't pay for it. Weigh it carefully, though: a skipped prefetch means that request gets no gate at all.

## Mistake 2: treating Proxy as the auth layer

The getting-started page is direct: Proxy is not intended for slow data fetching, and while it's fine for optimistic checks such as permission-based redirects, it should not be your full session management or authorization solution.

The pattern that fits is a cheap, stateless check on the cookie, and the real check where the data is read:

```ts
// proxy.ts: optimistic: "does a session cookie exist at all?"
export function proxy(request: NextRequest) {
    if (!request.cookies.has("session")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }
}

export const config = { matcher: ["/dashboard/:path*"] };
```

```ts
// lib/dal.ts: authoritative: verify the session and the resource
import "server-only";

export async function getInvoice(id: string) {
    const session = await verifySession(); // signature, expiry, revocation
    const invoice = await db.invoice.findUnique({ where: { id } });
    if (invoice?.ownerId !== session.userId) throw new Error("Forbidden");
    return invoice;
}
```

There's a structural reason, too. The execution-order list puts Proxy after `headers` and `redirects` from `next.config.js` and before filesystem routes. Server Functions aren't separate routes in that chain: they are POSTs to the route where they're used. A matcher that excludes a path also skips Server Function calls on it, and a refactor that moves a function to another route can silently remove coverage. The docs' advice is to verify authentication and authorization inside each Server Function rather than rely on Proxy alone. (We covered the action side in an [earlier tip](/blog/2026-10-20-nextjs-server-action-authz).)

## Mistake 3: expecting caching to work inside Proxy

Two things that look like they should work don't:

- `"use cache"` and `"use server"` directives have no effect in Proxy, because Proxy doesn't apply directive transforms.
- `fetch` options like `cache`, `next.revalidate` and `next.tags` don't cache responses there.

So a feature-flag lookup or redirect-table fetch in Proxy hits its origin on every matched request. The docs point to an external cache or data store, or to moving the work into a Server Component or Route Handler. For a static redirect list, the `redirects` option in `next.config.ts` is the first thing to try: it's evaluated before Proxy, and the docs recommend it for simple cases.

## Mistake 4: passing data downstream the wrong way

Proxy runs separately from render code, and the docs warn against relying on shared modules or globals. To hand something to the app, use headers, cookies, rewrites, redirects or the URL. The header form has one trap:

```ts
export function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant", resolveTenant(request));

    // Correct: visible to your Server Components via headers()
    return NextResponse.next({ request: { headers: requestHeaders } });

    // Wrong: this sends the header to the client instead
    // return NextResponse.next({ headers: requestHeaders });
}
```

Keep headers small; the docs warn that large ones can trigger a 431 depending on your backend server. Also note that during RSC requests Next.js strips internal Flight headers (`rsc`, `next-router-state-tree`, `next-router-prefetch`) from `request.headers`, so you can't branch on them to treat RSC and HTML requests differently. If you reimplement a rewrite with your own `fetch`, you must forward those headers yourself, or use `NextResponse.rewrite()`, which propagates them. `skipProxyUrlNormalize` exists for that advanced case.

## Cheap extras

- **Background work:** the second argument, `event`, exposes `waitUntil(promise)`, which keeps Proxy alive after the response is sent. Good for logging, bad for anything you need before responding.
- **Runtime:** Proxy defaults to the Node.js runtime, and setting `runtime` in a Proxy file throws.
- **Testing:** `next/experimental/testing/server` has `unstable_doesMiddlewareMatch` for asserting a matcher, and `isRewrite`/`getRewrittenUrl` for the response. It's marked experimental, but matcher regressions are exactly what you want a unit test for.
- **Migration:** `npx @next/codemod@canary middleware-to-proxy .` renames the file and function.

## Trade-offs

Scoping with an explicit allow-list (`/dashboard/:path*`) is safer against accidentally gating assets, but a new protected route has to be added by hand. A negative lookahead protects new routes by default and makes you maintain the exclusions. Pick one deliberately and put a matcher test next to it. And keep the Proxy check optimistic: if it's your only gate, one matcher edit away from an open route is too thin.

Doing a real session lookup in Proxy is still reasonable in a narrow case: a cheap, local signature check on a JWT or signed cookie, no network. The moment it needs a database or a revocation list, that logic belongs in the data access layer.

## Sources

- [proxy.js file convention (Next.js docs)](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Proxy getting started (Next.js docs)](https://nextjs.org/docs/app/getting-started/proxy)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
