---
title: "Next.js shipped two security releases in nine days: what to patch"
description: "Next.js 16.3.6 fixed a critical ImageResponse RCE on Sept 22, and 16.3.8 / 15.5.27 landed Sept 30. Here is who is affected and how to verify your upgrade."
date: 2026-10-01
cover: /images/blog/2026-10-01-nextjs-september-2026-security-releases.svg
tags: [Next.js, Security]
draft: false
---

September 2026 was a heavy month for Next.js security. An out-of-band release on September 22 fixed a critical remote code execution issue in `next/og`, and a scheduled release on September 30 followed with a batch of fixes around caching, the image optimizer and metadata routes. If you run Next.js in production, you likely need to act on both.

## Release 1: September 22, critical `ImageResponse` RCE

According to the [official security update](https://nextjs.org/blog/nextjs-security-update-september-22-2026), versions 16.3.6 (Active LTS) and 15.5.26 (Maintenance LTS) upgrade upstream dependencies, including Satori, to close a hole that could lead to remote code execution.

The details that matter for triage:

- The advisory is [GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), with a related upstream advisory in Satori.
- Affected range: `>=16.2.0 <16.3.6`.
- The problem is in the **Node.js** `ImageResponse` implementation in `next/og`. Improper escaping in the SVG that Satori generates could, under specific conditions, lead to RCE through vulnerabilities in other upstream dependencies.
- The **Edge** `ImageResponse` implementation is not affected.
- 15.5.26 contains related hardening, but Next.js 15.x is not affected by the RCE itself.

The practical consequence is that the blast radius depends on a runtime choice. A route like this one is in scope on 16.2.0 through 16.3.5:

```ts
// app/og/route.tsx — Node.js runtime (the default), affected before 16.3.6
import { ImageResponse } from "next/og";

export async function GET(request: Request) {
    const title = new URL(request.url).searchParams.get("title") ?? "Hello";
    return new ImageResponse(<div style={{ fontSize: 64 }}>{title}</div>, {
        width: 1200,
        height: 630,
    });
}
```

Treat this as the pattern to audit: user-controlled input flowing into an OG image generator on the Node.js runtime. Moving such routes to the Edge runtime is not a substitute for upgrading, but the advisory states that the Edge implementation is not affected, so it can reduce exposure while a rollout is in progress. Whether that move is viable depends on your hosting and on what the route imports.

## Release 2: September 30, scheduled fixes

The team gave advance notice in a [pre-announcement](https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026), published September 23. A note added on September 29 says 16.3.7 shipped with a bug fix only, and that the security fixes would arrive in **16.3.8** and **15.5.27** instead.

The pre-announcement counted nine vulnerabilities: one critical, two high, five medium and one low. I could not fetch the full official advisory post for the September 30 release; its URL did not resolve when I tried. The only post-release summary I could read is [Netlify's changelog](https://www.netlify.com/changelog/2026-09-30-nextjs-react-security-vulnerabilities/), and it describes **seven** issues: one high, five medium and one low. The two counts do not match. The critical item from the pre-announcement may simply be the September 22 issue already fixed, but that is my inference and not something either source states. Check the official advisories on GitHub for the authoritative list before you decide your risk.

Per Netlify's summary, the issues include:

- **High:** an image optimizer SSRF, affecting 16.x setups where attacker-controlled remote hosts are involved.
- **Medium:** cache poisoning for SSG/ISR pages, information disclosure through metadata image routes, cache leaks involving nested components, and Draft Mode content exposure.
- **Low:** information disclosure from the development server.

Netlify also states that, on its platform, three of these (the image SSRF, the Draft Mode leak and the dev server disclosure) do not apply because of how its image CDN and serverless architecture work. Webpack builds, SSG/ISR with catch-all routes and Cache Components setups remain affected there. That is a statement about one host; do not assume your own platform has the same protections.

## What to do

Upgrade to a release that contains both rounds of fixes:

```bash
# 16.x line
pnpm add next@16.3.8

# 15.x line
pnpm add next@15.5.27
```

Then:

1. **Check the lockfile, not just `package.json`.** With caret ranges, a stale lockfile will keep you on a vulnerable version. Run `pnpm why next` in each workspace package, since monorepos often pin several versions.
2. **Update your platform adapter.** Netlify's guidance includes updating `@netlify/plugin-nextjs` to 5.16.1 and redeploying. Other hosts will have their own adapter or runtime updates; look for them.
3. **Redeploy everything, including previews.** Netlify suggests considering deletion of vulnerable preview and branch deploys, because they keep serving the old code.
4. **Purge shared caches after upgrading** if you rely on SSG/ISR behind a CDN. Patching code does not evict responses that were already poisoned. This is general cache hygiene rather than a step from the advisories, so judge it against your own traffic and setup.
5. **Audit OG image routes** as described above, and treat any user-controlled input there as hostile.

## Trade-offs and caveats

- **Skipping 16.3.7.** It carried no security fixes, so a pipeline that auto-bumps to "latest minor/patch" and stops there would have been left exposed. Pin to the fixed versions explicitly or gate on an audit step.
- **15.x versus 16.x.** The 15.5 line got hardening for the first issue but was not vulnerable to the RCE. It is still in scope for the September 30 fixes, since 15.5.27 exists for that reason.
- **Upgrade risk is not zero.** Patch releases on LTS lines are meant to be conservative, but you should still run your E2E suite against the new version, especially around image optimization and ISR behavior, which are exactly the areas touched.
- **Advance notice cuts both ways.** A week of warning gives teams time to schedule a deploy, but it also tells attackers that a batch of fixes is coming, so do not leave the upgrade for the end of the window.

## Takeaway

Two releases, two different problems: a dependency-driven RCE on the Node.js `ImageResponse` path, and a scheduled batch touching caching, image optimization and metadata routes. The fix is the same for both: land 16.3.8 or 15.5.27, verify the lockfile, redeploy every environment, and read the official advisories for the exact list that applies to your configuration.

## Sources

- [Next.js Security Update for a Critical Upstream Issue (Sept 22, 2026)](https://nextjs.org/blog/nextjs-security-update-september-22-2026)
- [Upcoming Next.js Security Update for a Critical Upstream Issue](https://nextjs.org/blog/upcoming-nextjs-security-release-september-22-2026)
- [Upcoming Next.js September Security Release](https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026)
- [Netlify: Next.js security release (Sept 2026)](https://www.netlify.com/changelog/2026-09-30-nextjs-react-security-vulnerabilities/)
- [Next.js blog: nextjs-security-update-september-30-2026 (fetched; page not found)](https://nextjs.org/blog/nextjs-security-update-september-30-2026)
