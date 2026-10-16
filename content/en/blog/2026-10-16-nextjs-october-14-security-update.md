---
title: "Next.js 16.4.1 and 15.5.28: two critical RCEs and a Server Actions DoS"
description: "The October 14 Next.js security update fixes two critical RCEs (use cache typed arrays, SVG image optimization) and a Server Actions DoS. Who is exposed and what to do."
date: 2026-10-16
cover: /images/blog/2026-10-16-nextjs-october-14-security-update.svg
tags: [next.js, security, caching]
draft: false
---

On October 14 the Next.js team shipped an out-of-band security update: **16.4.1** on the Active LTS line and **15.5.28** on Maintenance LTS. According to the [official post](https://nextjs.org/blog/nextjs-security-update-october-14-2026), it carries two fixes that were postponed from the September release because of upstream dependency delays. It addresses two critical remote-code-execution bugs and one high-severity denial of service. None of the three has a real workaround for the framework-level issues, so this is a "patch now" release.

```bash
npm install next@16.4.1   # 16.x
npm install next@15.5.28  # 15.5.x
```

## The three advisories

| Advisory | Severity | Affected | Fixed |
| --- | --- | --- | --- |
| [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr): RCE via `use cache` returning typed arrays | Critical (CVSS v4 9.5) | 16.0.0 – 16.4.0 | 16.4.1 |
| [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) / CVE-2026-96889: RCE in Image Optimization with SVG | Critical (CVSS v4 9.5) | 10.0.0 – 15.5.27, 16.0.0 – 16.4.0 | 15.5.28, 16.4.1 |
| [GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r): DoS in App Router with Server Actions | High (CVSS v4 8.2) | 13.0.0 – 15.5.27, 16.0.0 – 16.4.0 | 15.5.28, 16.4.1 |

Note the shape of the version ranges. The `use cache` bug only exists on the 16 line, because Cache Components is a 16-era feature. The other two reach back years, so older majors that no longer receive patches are exposed with no fix available. The advisories list only the patched versions above; if you are on 14.x or an unpatched 15.x, the only path is moving to a supported line.

## 1. RCE in `use cache` functions that return typed arrays

This one is specific to the App Router with Cache Components. Per the advisory, an application is affected when it has a `use cache` function that returns **multiple typed arrays**. The Next.js post also links a related upstream React advisory, [GHSA-xqc2-xf4c-x3h3](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3), which I did not fetch, so I can't describe its content.

The pattern to grep for looks like this:

```ts
// Hypothetical shape of an affected function (16.0.0 – 16.4.0)
export async function getBuffers() {
    "use cache";
    return {
        a: new Uint8Array(await loadA()),
        b: new Float32Array(await loadB()),
    };
}
```

I am deliberately not explaining the exploit mechanism: the advisory doesn't, and I won't guess. What matters operationally is the advice in the post: **upgrade immediately even if your application does not have similar functions.** The advisory lists no workaround, so auditing your code to prove you are safe is not a substitute for the patch. Cached functions can also live in dependencies or in code that gets generated, which makes a grep an unreliable negative signal.

## 2. RCE in Image Optimization when SVGs are involved

The root cause is outside Next.js. The post describes a memory-related vulnerability in an upstream library used by Image Optimization; it can lead to remote code execution when Next.js runs on **glibc-based Linux**. The advisory title ties it to SVG handling, and no authentication is required.

The workaround is the interesting part, because it is a dependency pin rather than a config flag:

- Make sure the `sharp` version Next.js resolves is **0.35.5 or later**.
- Upgrading Next.js to 15.5.28 or 16.4.1 makes package managers supply a fixed `sharp` automatically.

Check what you actually resolve, especially in a monorepo or with overrides:

```bash
pnpm why sharp
# or
npm ls sharp
```

If a lockfile pins an older `sharp`, or your `package.json` carries a manual `overrides`/`pnpm.overrides` entry for it, upgrading `next` alone may not change what runs. Fix the pin, reinstall, and rebuild the image, since the native binary is part of the artifact you deploy.

The glibc condition means Alpine/musl images are described differently from Debian/Ubuntu ones. I would not treat that as safety: the advisory states the condition for exploitation, but I haven't seen guidance that musl is exempt, and the fix is a plain upgrade either way.

## 3. Server Actions DoS

Crafted requests against an App Router app with **at least one Server Action** can cause excessive CPU usage. Because the work blocks processing of other requests in the same process, one cheap request stream degrades everything served by that Node process. Pages Router apps and apps without Server Actions are not vulnerable. The post links a related React advisory, [GHSA-h3gv-c5rc-p453](https://github.com/react/react/security/advisories/GHSA-h3gv-c5rc-p453), which I also did not read. The advisory states there is no workaround besides upgrading.

The practical consequence is architectural. A single-threaded Node server with one event loop turns a CPU-burning request into an availability problem for every user. Running several processes or instances limits how much one stuck process hurts, but it doesn't fix the bug, and a sustained attack can occupy all of them.

## What to do

1. **Upgrade and check the lockfile.** `pnpm why next` in every workspace package; monorepos often pin more than one version.
2. **Check `sharp` separately** as described above.
3. **Redeploy every environment**, including preview and branch deployments, which keep serving old code until rebuilt.
4. **Rebuild container images** so the new `sharp` binary is baked in, rather than restarting an old image.
5. **Check the adapter or platform you deploy to.** The advisories speak only about Next.js and its dependencies; hosts may ship their own adapter updates, and I haven't verified any here.

## Trade-offs and caveats

- **Patch cadence.** This is the second month in a row with critical Next.js fixes (see [September's releases](/blog/2026-10-01-nextjs-september-2026-security-releases)). Two of the three issues come from upstream components, which is a reminder that your attack surface includes the transitive dependency graph, not just your own routes.
- **`use cache` is no longer just a performance feature.** It now has a critical advisory with no workaround. If you adopted Cache Components early, put 16.x patch bumps on an expedited path.
- **"No known exploitation" is not in the sources.** The pages I fetched don't say whether these bugs are exploited in the wild, so don't assume either way. The CVSS scores are v4 base scores and don't capture your deployment.
- **Image Optimization exposure depends on your config.** The advisory doesn't say that restricting `images.remotePatterns` or disabling SVG support mitigates the bug, so I won't claim it does; upgrade first, then tighten configuration as defense in depth.
- **Version availability.** The release page marks 16.4.1 and 15.5.28 as the fixed versions; later 16.4.x patches exist, but they are a separate matter from this security fix.

## Takeaway

Two unauthenticated RCEs and a CPU-exhaustion DoS, fixed in 16.4.1 and 15.5.28. The one-line action is the upgrade; the extra checks are `pnpm why sharp` for the image pipeline, a rebuild of every deployed artifact, and a hard look at how long your older majors can stay unpatched.

## Sources

- [Next.js Security Update for Upstream Vulnerabilities (October 14, 2026)](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
- [Next.js blog index](https://nextjs.org/blog)
- [Next.js v16.4.1 release](https://github.com/vercel/next.js/releases/tag/v16.4.1)
- [Next.js releases](https://github.com/vercel/next.js/releases)
- [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr)
- [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
- [GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r)
