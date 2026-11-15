---
title: "Nuxt pro tip: $fetch on the server forwards no cookies, so use useFetch or useRequestFetch for authenticated calls"
description: "During SSR a bare $fetch drops the visitor's cookies, so authenticated pages render logged-out HTML. How useFetch, useRequestFetch and useRequestHeaders differ, and what to forward."
date: 2026-11-15
cover: /images/blog/2026-11-15-nuxt-request-fetch-cookies.svg
tags: [nuxt, pro-tip, data-fetching]
draft: false
---

Nothing substantive shipped in the last 72 hours that deserves a full article: the newest Vite releases are 8.x patch releases, and the latest [Nuxt blog](https://nuxt.com/blog) post is from October. So this is a pro tip, about a bug class that never shows up in the browser: an authenticated API call that works on client-side navigation but renders as "logged out" in the server HTML.

## The mistake

```vue
<script setup lang="ts">
// Runs on the server on first load, in the browser on navigation
const me = await $fetch("/api/me");
</script>
```

Two problems hide in these two lines, and they have different causes.

**1. No cookies on the server.** In the browser, the request carries the user's cookies automatically. During server-side rendering there is no browser; the server is making the request itself. The [data fetching docs](https://nuxt.com/docs/4.x/getting-started/data-fetching) say that, for security reasons, `$fetch` during SSR does not include the user's browser cookies. `/api/me` therefore sees an anonymous request, the server renders the anonymous state, and the page only becomes correct if some client code refetches later. That is a flash of wrong content at best and a hydration mismatch at worst.

**2. Double fetching.** The same docs warn that calling `$fetch` in component setup can fetch the data twice, once on the server and once during hydration, and can cause hydration issues. `useFetch` and `useAsyncData` avoid this by passing the server result to the client through the payload. `$fetch` is meant for client-only, event-driven calls (a button click, a form submit).

## The fix for the common case: `useFetch`

```vue
<script setup lang="ts">
const { data: me } = await useFetch("/api/me");
</script>
```

You get both fixes at once. According to the docs, on the server `useFetch` uses [`useRequestFetch`](https://nuxt.com/docs/4.x/api/composables/use-request-fetch) to forward the client's headers and cookies, except headers that are not meant to be forwarded, such as `host`. The payload carries the result across, so there is no second request on hydration.

If you want a custom key, a transform or other options, `useAsyncData` has the same payload behaviour, but then the forwarding is your job (next section).

## When you must call `$fetch` yourself

Inside `useAsyncData`, in a Pinia action that runs during SSR, or in a plugin, you are not going through `useFetch`. Use `useRequestFetch`:

```ts
const requestFetch = useRequestFetch();

const { data: me } = await useAsyncData("me", () => requestFetch("/api/me"));
```

Per the docs, `requestFetch` forwards the incoming request's context and headers on the server. In the browser it behaves like the normal `$fetch`, so the same code works on both sides. The docs' own example calls a route through `requestFetch` and shows that the route can then read the cookies with `parseCookies`, whereas a plain `$fetch` call gives it none.

Call `useRequestFetch()` where composables are allowed (setup, plugins, route middleware), not inside the callback after an `await`. That is general Nuxt composable context behaviour; in the snippet above it is called in setup, before the async work starts.

## Forwarding only what a call needs: `useRequestHeaders`

If you only want to forward specific headers, [`useRequestHeaders`](https://nuxt.com/docs/4.x/api/composables/use-request-headers) takes an array of names:

```ts
const headers = useRequestHeaders(["cookie"]);

async function getCurrentUser() {
    return await $fetch("/api/me", { headers });
}
```

The docs describe this as only necessary when you are not using `useFetch`. On the client it returns an empty object, so the call degrades to a normal browser request, where the browser attaches cookies itself.

Use it with a short allowlist. Calling it with no arguments returns every incoming header, and passing that wholesale to another origin is how credentials leak.

## Be careful with third-party hosts

The docs have a caution about proxying headers to an external API. Forwarding `cookie` or `authorization` to a host you do not control hands the visitor's session to that host. Keep these patterns separate:

- Your own Nitro routes, same origin: forward with `useFetch` or `useRequestFetch`.
- A backend you own on another origin: forward only the specific header it needs, and only if that backend trusts your app.
- A third-party API: never forward the visitor's cookies; call it from a Nitro route with a server-side credential.

The data fetching docs also list headers you should not proxy: `host`, `accept`, `content-length`, `content-md5`, `content-type`, `x-forwarded-host`, `x-forwarded-port`, `x-forwarded-proto`, `cf-connecting-ip` and `cf-ray`. The `useRequestFetch` page names a slightly different set as not forwarded (`transfer-encoding`, `connection`, `keep-alive`, `upgrade`, `expect`, `host`, `accept`). The two lists answer different questions, one about what you should hand-copy and one about what the helper skips, and neither page claims to be exhaustive. If you write your own forwarding, start from an allowlist rather than copying everything and removing a few.

## The other direction: `Set-Cookie`

Forwarding goes one way. If an internal request on the server returns `Set-Cookie` (a refreshed session, say), the visitor's browser will not receive it unless you pass it on. The docs show the pattern:

```ts
import type { H3Event } from "h3";

export const fetchWithCookie = async (event: H3Event, url: string) => {
    const res = await $fetch.raw(url);
    const cookies = res.headers.getSetCookie();
    for (const cookie of cookies) {
        appendResponseHeader(event, "set-cookie", cookie);
    }
    return res._data;
};
```

This is server-side code that needs the `event`, so it belongs in a server utility or a Nitro-aware helper, not in component code.

## Trade-offs

- **`useFetch` is not free.** It serialises the result into the payload. For large responses, trim it with `pick` or `transform`; see the earlier [payload tip](/blog/2026-10-28-nuxt-payload-pick-transform).
- **Per-user data and shared caching do not mix.** Once a page depends on forwarded cookies, caching its HTML or its API response for everyone is a correctness bug. Keep such routes out of shared cache rules.
- **Client-only is a valid answer.** If the data is private, not needed for SEO, and a loading state is acceptable, fetching only in the browser, from an event handler or after mount, avoids the question. You trade a faster first meaningful paint for simpler server behaviour.

## When bare `$fetch` is still right

- Event handlers: a click, a submit, a polling tick, all of which run in the browser.
- Server code that deliberately makes an anonymous or service-credentialed call, such as a Nitro route calling a third-party API.
- Public data where no per-user context is involved, though even then `useFetch` avoids the double request.

## A quick check

To catch this class of bug, load an authenticated page with JavaScript disabled, or view the page source. If the server HTML shows the logged-out state and the right state appears only after hydration, a bare `$fetch` (or a call that does not forward cookies) is the likely cause.

## Sources

- https://nuxt.com/blog
- https://nuxt.com/docs/4.x/getting-started/data-fetching
- https://nuxt.com/docs/4.x/api/composables/use-request-fetch
- https://nuxt.com/docs/4.x/api/composables/use-request-headers
- https://github.com/vitejs/vite/releases
- https://nextjs.org/blog
