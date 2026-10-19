---
title: "Tuning Partial Prefetching: what v0 learned from an agent-driven navigation refactor"
description: "Vercel's v0 case study on Next.js 16.4 shows instant() tests, intent-based prefetch and navigation() in practice, plus the cost numbers and caveats."
date: 2026-10-19
cover: /images/blog/2026-10-19-nextjs-v0-partial-prefetching.svg
tags: [next.js, caching, ai-assisted-development]
draft: false
---

On October 16 the Next.js team published [a case study on v0](https://nextjs.org/blog/improving-navigation-experience-in-v0-with-nextjs-16-4), Vercel's AI app builder. A coding agent used the new `next-partial-prefetching-optimizer` Skill to rework navigation across the app. The [16.4 release post](https://nextjs.org/blog/next-16-4) tells you what the APIs are. This one shows the decisions around them, including a prefetch rollout that went wrong and was measured and corrected. That makes it the more useful of the two for anyone planning the same migration. I covered the release itself [in an earlier post](/blog/2026-10-08-nextjs-16-4-cache-components); this one is about applying it.

## The model in one paragraph

Before Partial Prefetching, per the case study, `prefetch={true}` fetched the whole destination including dynamic content. That could fetch pages nobody opens, and a click before the prefetch finished still navigated slowly. Turning prefetching off moved all the work after the click. With Partial Prefetching, Next.js prefetches the reusable parts of a route and the rest loads during navigation. Cached content, including personalised content kept in the browser, can be reused on return visits. In 16.4, `create-next-app` enables `cacheComponents` and `partialPrefetching` by default:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    partialPrefetching: true,
};

export default nextConfig;
```

Individual routes can also opt in with `export const prefetch = 'partial'`, which is how v0 adopted it on `/chat` before enabling it globally.

## Make "instant" a failing test first

The most transferable idea isn't a Next.js API. It is the test. The `instant()` helper from `@next/playwright` holds back content that only arrives during navigation while the click happens, so you can assert on what the user sees without waiting for it:

```ts
import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

test("prefetches the primary template UI", async ({ page }) => {
    await page.goto("/templates");
    const card = page.getByTestId("template-card-link").first();

    await instant(page, async () => {
        await card.click();
        await page.waitForURL("**/templates/*");
        await expect(page.getByTestId("template-detail-skeleton")).toHaveCount(0);
        await expect(page.getByTestId("template-detail-header")).toBeVisible();
    });
});
```

The Skill's loop is: pick a navigation and the UI that should be ready, write a passing `instant()` test for the current state, add the target assertions and confirm they fail, refactor with caching and prefetching, rebuild and rerun until green, then verify the regression check and keep the test. This is plain test-first development with a rendering-behaviour oracle, which is also why it suits an agent: "done" is a pass/fail signal rather than a judgement. The test stays in the repo and can run in CI. v0 doubled its number of `instant()` tests as a result.

## Separate shared data from personal data

For `/templates/[id]`, the agent split public template data from viewer-specific state. The public part went behind `'use cache: remote'` with a lifetime and a tag:

```tsx
import { cacheLife, cacheTag } from "next/cache";

async function loadCachedPublicTemplatePageData(templateId: string) {
    "use cache: remote";
    cacheTag(`template:${templateId}`);
    cacheLife("hours");

    return loadPublicTemplatePageData(templateId);
}
```

Publishing a template calls `revalidateTag()`. A caveat from the post is that on Vercel this lands in Runtime Cache, shared across users and function instances, but with a self-hosted `next start` `'use cache: remote'` uses memory unless you configure `cacheHandlers.remote`. Plain `'use cache'` also defaults to memory. If you self-host with several instances, that is a setup step, not a detail.

For per-user settings pages under `/settings/[scope]`, the agent used `'use cache: private'` so content stays in the browser, passed `scope` into the cached function so it is part of the cache key, and used `cacheLife({ stale: 300 })` for the Advanced page. Writes were paired with reads: the Server Action that saves custom instructions calls `updateTag()`, which expires the cached entry immediately so the user sees the new value in the same round trip.

## The rollout that over-prefetched

This is the part to read closely. After adding `prefetch={true}` to every card link in the templates grid, production metrics showed prefetch requests to `/templates/[id]` up **2.9×**. Every visible card was now fetching its richer prefetch on viewport entry. The fix was to wait for intent:

```tsx
const [intent, setIntent] = useState(false);

<Link
    href={href}
    prefetch={intent ? true : "auto"}
    onMouseEnter={() => setIntent(true)}
    onFocus={() => setIntent(true)}
    onTouchStart={() => setIntent(true)}
/>;
```

v0 put this in an existing Link wrapper, used it for other large lists and grids, and kept visibility-based prefetching for small, fixed groups such as the settings tabs. The rule of thumb that falls out: link count decides the prefetch trigger. A handful of links can be eager; a grid cannot.

## `navigation()` for the part nobody needs before the click

For a project page, the title and production deployment had to be ready on click, while "Recent Chats" only needed to be cached for return visits. Awaiting `navigation()` inside that component defers its cached work until the page actually opens, and it then stays available on return:

```tsx
import { navigation } from "next/cache";

async function RecentChats({ projectId }: { projectId: string }) {
    await navigation();

    const chats = await loadProjectChats(projectId);
    return <ChatList chats={chats} />;
}
```

Wrap the component in `Suspense` so the shell can show a skeleton for just that region. The 16.4 post also adds `prefetch()`, the mirror image, for deferring content until an explicit prefetch.

## The numbers, and how far to trust them

The team tracked four things after each PR: Runtime Cache spend, request volume including prefetches, Active CPU, and data transfer from prefetches. Across the whole app, total daily cost ended **2.9% lower**, with Shared Runtime Cache spend at **4.3×** its earlier level (about $3.44 per day more), offset by fewer requests and lower compute and transfer. Request-serving costs they tracked fell **14.4%**.

The authors say themselves that traffic and unrelated deployments changed during the same period, and that they treat this as confirmation the refactor didn't make v0 more expensive, not as savings caused by it. I'd read it the same way. It is one app, no controlled comparison, and the cache bill rising 4.3× is a real trade-off that is easy to miss if you only watch latency.

## What to take from it

- **Measure prefetch volume, not just UX.** The 2.9× jump was invisible in the demo and obvious in request counts.
- **Cache keys carry privacy.** Put `scope`, user or tenant identifiers into the arguments of any `'use cache: private'` function.
- **Pair every cached read with its invalidation.** `revalidateTag()` for shared data, `updateTag()` when the writer must see the result immediately.
- **Check your hosting.** Memory-backed caches behave differently from Runtime Cache once you run more than one instance.
- **Skill, not magic.** The Skill assumes Cache Components and Partial Prefetching are already adopted. The post says it can make a best effort from a broad goal, but the v0 team wrote precise prompts about what must be ready before the click and what may wait. Review the diffs as you would any other.

## Sources

- [Improving navigation experience in v0 with Next.js 16.4](https://nextjs.org/blog/improving-navigation-experience-in-v0-with-nextjs-16-4)
- [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- [Next.js blog index](https://nextjs.org/blog)
