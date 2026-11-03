---
title: "Nuxt 4.6.4: eight advisories, and three behaviour changes in cached routes, error pages and dev hosts"
description: "Nuxt 4.6.4 fixes eight advisories and bumps nitropack to 2.13.6. What changes for cache route rules, production error payloads and devServer.allowedHosts."
date: 2026-11-03
cover: /images/blog/2026-11-03-nuxt-4-6-4-security.svg
tags: [nuxt, nitro, security]
draft: false
---

Nuxt [v4.6.4](https://github.com/nuxt/nuxt/releases/tag/v4.6.4) was published on 2 November, one week after [4.6.3](/blog/2026-10-27-nuxt-4-6-3-security). It is another security release: the notes say it fixes eight advisories in Nuxt and, through `nitropack` 2.13.6, three more in Nitro. The notes recommend upgrading as soon as you can. They do not list the advisories individually, so I cannot give you IDs, severities or affected ranges. They point to the [Nuxt](https://github.com/nuxt/nuxt/security/advisories) and [Nitro](https://github.com/nitrojs/nitro/security/advisories) advisory pages for that.

What the notes do spell out is a short list of behaviour changes that "probably won't affect most apps". Those are the part worth reading before you bump a version, because they change what your app returns.

## 1. Production error pages only expose `createError` details

When a page fails to render on the server, the error page and the payload now include only the `message` and `data` of errors created with `createError`. Everything else on an error is stripped. A related fix in the same release is titled "do not expose details of untrusted thrown errors".

If you throw deliberately, you are fine, and you now have a clear contract:

```ts
// pages/orders/[id].vue
const { data, error } = await useFetch(`/api/orders/${route.params.id}`);

if (!data.value) {
    throw createError({
        statusCode: 404,
        statusMessage: "Order not found",
        // `message` and `data` are what a production error page can carry
        message: "This order does not exist.",
        data: { orderId: route.params.id },
    });
}
```

The consequence is for code that read other properties off a server-side error in production, such as a custom `error.vue` that renders a stack, a cause or a custom field. After the upgrade those will be missing. Put anything the user may see into `message` or `data`, and keep the rest in your logs. The release notes do not enumerate which properties disappear, so check your `error.vue` against a production build rather than `nuxt dev`.

## 2. Cache route rules store fewer responses

Three changes land in the Nitro layer under `cache`, `swr` and `isr` route rules:

- Only `GET` and `HEAD` requests are cached.
- Responses that set a cookie, or send `Cache-Control: private` or `no-store`, are no longer stored.
- Wildcard `proxy` and `redirect` rules reject a request whose resolved target would leave the rule's scope.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    routeRules: {
        "/products/**": { swr: 60 },
        "/account/**": { cache: { maxAge: 30 } },
        "/legacy/**": { redirect: "/new/**" },
    },
});
```

The cookie and `private`/`no-store` rule is the one with operational impact. Consider a page under a cached rule that calls `setCookie` for a session or a consent flag on some requests. Before, such a response could be stored and replayed; now it is not stored. That is the safer behaviour, and it lines up with the cross-user payload disclosure on cached pages that the [4.5.1 release](https://github.com/nuxt/nuxt/releases) lists among its fixes. The cost is a lower hit rate if your pages set cookies incidentally. Watch your cache hit ratio after the upgrade, and if it drops, find which responses set a cookie. Those are the ones that were never safe to share.

If you purged CDN or edge caches after 4.5.1 for the same reason, the same logic applies here: a cache in front of the app can still hold responses stored before you upgraded.

## 3. Route rules now see encoded slashes

Rules now match paths that contain encoded slashes. The notes' example: `/api%2Fadmin` is covered by a `/api/**` rule. This is the same family as the dot-segment and case-sensitivity work in 4.6.2 and 4.6.3: the rule matcher and the thing that finally resolves the path must agree. A header or `no-store` rule that a differently encoded URL could slip past is now a rule that applies.

Extend the smoke test idea from the previous release with an encoded variant:

```bash
for p in /api/admin /API/admin /api%2Fadmin; do
  printf '%s -> ' "$p"
  curl -s -o /dev/null -D - --path-as-is "http://localhost:3000$p" | grep -i '^cache-control' || echo "(none)"
done
```

That script is my own, not from the release notes. Run it against a production build, since the rule-matching changes are in the Nitro layer.

## 4. Dev servers reject unexpected `Host` headers

The Webpack and rspack dev servers now reject requests whose `Host` header is unexpected. The notes say this matches existing Vite behaviour, so Vite users should already be used to it. The release adds a `devServer.allowedHosts` option, introduced in a commit that touches the schema, Nitro and Vite integration. If you reach your dev server through a custom hostname or a tunnel, add that host to the option. The release page does not document the accepted value format, so read the Nuxt configuration docs for the exact syntax rather than guessing.

A smaller related change: when `workspaceDir` is not set, Nuxt now widens it past `rootDir` only to an explicit workspace root or the closest git repository. In a monorepo with a stray `.git` or workspace file higher up, the detected directory, and with it what the dev server is allowed to serve, may differ from before.

## Smaller items worth knowing

- `x-forwarded-proto` is trusted only when you opt in (#36818). If you terminate TLS in front of Nuxt and relied on the header being honoured by default, verify that generated absolute URLs and redirects still use `https`. The notes do not name the opt-in setting, so look it up in the docs.
- Route rule wildcard tails are preserved for case-insensitive rules, and wildcard redirect tails are resolved from matched segments.
- The island hash uses an unambiguous encoding, and the docs now warn against spreading untrusted objects onto server components.
- `nitropack` must be 2.13.6 and `unrouting` 0.3.2, both bumped by the release.
- A body read through a `nuxt/server` handler now streams (#36817).

## Upgrade checklist

1. Run `npx nuxt upgrade` and make sure the lockfile resolves `nitropack` to 2.13.6.
2. Build and run production locally, then trigger a handled and an unhandled server error. Confirm `error.vue` shows what you expect.
3. Compare cache hit ratio and `Set-Cookie` behaviour on pages under `cache`, `swr` or `isr` rules.
4. Probe sensitive route rule paths with mixed case, encoded slashes and dot segments.
5. Add tunnel or custom hostnames to `devServer.allowedHosts` if dev requests start failing.
6. If you sit behind a TLS-terminating proxy, check scheme handling for `x-forwarded-proto`.
7. Purge CDN caches that sit in front of cached routes.

## Trade-offs and caveats

- The release page has no advisory IDs, severity or version ranges. Read the two advisory pages before deciding how urgent this is for your deployment; the notes themselves say to upgrade quickly.
- Several fixes are one-line entries. Treat my descriptions of them as readings of the titles, not of the patches.
- Tightening cache and error behaviour is the right default, but it is a behaviour change in a patch release. A green CI run will not tell you that your error page lost a field or that your hit ratio fell; only production-mode tests and metrics will.
- Cadence is high: 4.6.2, 4.6.3 and 4.6.4 landed within three weeks. Pin the version and upgrade on purpose.

## Sources

- [Nuxt v4.6.4 release notes](https://github.com/nuxt/nuxt/releases/tag/v4.6.4)
- [Nuxt releases list](https://github.com/nuxt/nuxt/releases)
