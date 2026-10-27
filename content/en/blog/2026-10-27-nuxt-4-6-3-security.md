---
title: "Nuxt 4.6.3: five security advisories, mostly on the dev server and route rules"
description: "Nuxt 4.6.3 fixes five advisories: dev-server file exposure, dot segments in paths and redirect rules on islands. What to verify before you upgrade."
date: 2026-10-27
cover: /images/blog/2026-10-27-nuxt-4-6-3-security.svg
tags: [nuxt, nitro, security]
draft: false
---

Nuxt [v4.6.3](https://github.com/nuxt/nuxt/releases/tag/v4.6.3) was published today, 27 October. The release notes describe it as a patch release, but the changelog opens with five security advisories and then a long list of route-rule and navigation fixes. The notes do not give severity ratings, CVSS scores or affected version ranges, so for those you need the individual GHSA pages. What follows is what the release page does say, and what it means for a production app.

## The five advisories

The release notes list one-line titles only. My reading of each:

| Advisory | Area | What the fix does |
| --- | --- | --- |
| GHSA-x287-wcfc-q46c | vite | Stops reading files named in client error reports |
| GHSA-648h-gw55-m2g7 | vite | Blocks dev server access to Nitro dev output |
| GHSA-3xf4-9g3c-4h4w | vite | Stops the dev server from serving the generated app secret |
| GHSA-9v7c-q64q-vv33 | nitro, nuxt | Handles dot segments (`.` and `..`) in request paths |
| GHSA-2fxj-c3j7-rr69 | nuxt | Applies redirect route rules to page islands |

Three of the five are in the Vite integration and concern the **dev server**. That sets the exposure: if you only ever run `nuxt dev` on localhost, those are a smaller problem than they sound. They matter when the dev server is reachable from elsewhere, for example inside a container with a published port, on a shared network, or behind a tunnel used for demos.

The app secret one deserves attention because of 4.6.0. That release introduced a root application secret set via `NUXT_APP_SECRET`, used for the new session support, as the [release list](https://github.com/nuxt/nuxt/releases) describes it. A dev server that could be coaxed into serving the generated secret is exactly the kind of thing that turns "it's only dev" into a real credential leak. The release page does not say whether it was exploitable in practice, and I won't guess. If you ever exposed a dev server to untrusted clients on 4.6.x, rotate any secret you derived from or stored alongside a generated one.

### Dot segments in request paths

The fourth advisory touches both Nitro and Nuxt: dot segments in request paths are now handled. Dot segments are the `/./` and `/../` parts of a path. Anything that matches a path string against a rule, a prefix or a static directory before normalising it can disagree with the layer that finally resolves the file. The details are in the advisory, not the release page; the practical point is that route rules and middleware which guard path prefixes are only as safe as the normalisation that happens before they run.

### Redirect rules on page islands

Redirect route rules now apply to page islands. A [`routeRules`](/blog/2026-10-14-nuxt-route-rules) redirect looks like this:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    "/old-pricing": { redirect: { to: "/pricing", statusCode: 301 } },
  },
});
```

Before the fix, as I read the advisory title, a request for the island form of a page could bypass the redirect that the normal page request would hit. If you use redirects to retire pages that should no longer render, this is the one to retest: request the island endpoint for such a page and confirm you get the redirect rather than rendered content. This continues the server-island hardening from [4.6.2](/blog/2026-10-17-nuxt-4-6-2-patch) and the 4.5.1 security release, which the release list says fixed several island and route-rule authorization issues.

## Route rule behaviour changes you should test

Beyond the advisories, a cluster of fixes changes how route rule keys match. Each one is a one-line entry, so read the PRs for anything you depend on:

- Constrained route rules are no longer treated as covering dynamic pages (#36701).
- Page paths are encoded before matching route rule keys (#36683).
- The page prefix is normalised when finding route rule exceptions (#36685).
- Case-dependent route rule constraints are rejected when `sensitive: false` (#36708).
- Regex constraints in route rule keys are no longer case-folded (#36694).
- `noScripts` wildcard patterns stay single-segment in Nitro.

The theme is consistent with 4.6.2's case-insensitive matching: make rule matching agree with what the router resolves. The side effect is that a rule which *accidentally* covered something now might not, and a rule you wrote narrowly might behave differently. If you keep security-relevant headers or `no-store` caching in `routeRules`, write a small script that requests representative URLs (mixed case, encoded characters, dynamic params) and asserts the headers:

```bash
for p in /admin/x /Admin/x /admin/%78 /admin/../admin/x; do
  printf '%s -> ' "$p"
  curl -s -o /dev/null -D - --path-as-is "http://localhost:3000$p" | grep -i '^cache-control' || echo "(none)"
done
```

That is my own smoke test, not something from the release notes. `--path-as-is` stops curl from collapsing the dot segments for you, which is what you want when probing the fix above.

## Other changes that can bite

**Navigation and runtime**

- `navigateTo` now returns redirects only while middleware is running (#36650), and `RouteLocationRaw` is hidden from its public return type (#36691). Code that inspects the return value outside middleware, or imports that type through it, is the likeliest to need a change.
- Purged entries are removed from `_asyncData` (#36709), and app scope cleanup is deferred on external navigation (#36713).
- `useCookie` CookieStore sync no longer rewrites a cookie with a refresh (#36673).
- A rejected `updateCallbackDone` from an aborted view transition is handled (#36639).

**Nitro**

- The portable request is aborted when the client disconnects (#36652), and prerender hints are not shared with self-fetched requests (#36705).
- nitropack moves to 2.13.5 with obsolete workarounds dropped (#36649).

**Build performance**

- Plain style blocks are skipped in the server build (#36711), ESM Vue is bundled with caches reused (#36710), and a quadratic nested directory check for `fs.allow` is removed (#36702).
- Internal custom links are server-rendered without `RouterLink` (#36707), and typed routes generation is skipped when unneeded (#36645).
- `shared/` is now part of the build cache hash (#36704). If you share code between app and server through `shared/`, this prevents stale cached builds.

The release page gives no benchmark numbers for any of these, so treat them as direction, not measured gains.

## Upgrade checklist

1. Run `npx nuxt upgrade` and dedupe the lockfile. The release list recommended `--dedupe` for the 4.5.1 security release; the 4.6.3 page itself gives no upgrade instructions.
2. If any dev server was reachable by others on 4.6.x, rotate secrets that depended on the generated app secret.
3. Request island endpoints for pages covered by redirect rules and confirm they redirect.
4. Run your route-rule smoke test with mixed case, encoded and dot-segment paths.
5. Grep for code that uses the return value of `navigateTo` outside middleware.
6. If tooling fetched Nitro dev output or the generated secret from the dev server, expect it to fail now. That is intended.

## Trade-offs and caveats

- The release page has no severity or affected-version data. Go to the GitHub Security tab before deciding how urgent the upgrade is for you; for an app that exposes no dev server, the production-relevant items are the dot-segment and island-redirect fixes.
- Several fixes are described in a handful of words. My descriptions of the advisories come from those titles, not from the advisory texts, so verify the mechanics there before quoting them in a security review.
- Tightening route-rule matching is the right direction, but it is a behavioural change in a patch release. A patch bump in CI will not tell you your `routeRules` still guard what you think they do; only a request-level test will.
- Patch cadence is high: 4.6.1, 4.6.2 and 4.6.3 arrived within three weeks of 4.6.0. Pin your version and upgrade deliberately rather than on a floating range.

## Sources

- [Nuxt v4.6.3 release notes](https://github.com/nuxt/nuxt/releases/tag/v4.6.3)
- [Nuxt releases list](https://github.com/nuxt/nuxt/releases)
