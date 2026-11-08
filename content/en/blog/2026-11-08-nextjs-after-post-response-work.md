---
title: "Next.js pro tip: move logging and analytics into after() so they stop sitting in the response path"
description: "Awaiting analytics or audit logging before returning slows every response. Learn how Next.js after() works, where request APIs are allowed, and what self-hosting needs."
date: 2026-11-08
cover: /images/blog/2026-11-08-nextjs-after-post-response-work.svg
tags: [next.js, pro-tip, performance]
draft: false
---

A mutation handler ends with `await logUserAction(...)`, or a layout awaits an analytics call before it returns JSX. Nothing in the response depends on that work, but the user waits for it anyway. Next.js has a stable primitive for this: `after`. The [official reference](https://nextjs.org/docs/app/api-reference/functions/after) describes it as a way to schedule work that runs once the response (or prerender) is finished, aimed at side effects such as logging and analytics. It became stable in `v15.1.0`, per the same page's version history.

## The pattern to replace

```ts
// app/api/orders/route.ts
import { cookies, headers } from "next/headers";
import { saveOrder, logUserAction } from "@/app/utils";

export async function POST(request: Request) {
    const order = await saveOrder(await request.json());

    // The client waits for this, although the response doesn't need its result.
    const userAgent = (await headers()).get("user-agent") ?? "unknown";
    const session = (await cookies()).get("session-id")?.value ?? "anonymous";
    await logUserAction({ session, userAgent, orderId: order.id });

    return Response.json({ status: "success", id: order.id });
}
```

Every millisecond spent in `logUserAction` is added to the response time. If the analytics backend has a slow tail, your mutation inherits it. Wrapping the call in a fire-and-forget promise does not fix this properly: on a serverless platform the invocation may end before the promise settles, and nothing tells the runtime to wait.

## The improved version

```ts
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { saveOrder, logUserAction } from "@/app/utils";

export async function POST(request: Request) {
    const order = await saveOrder(await request.json());

    after(async () => {
        const userAgent = (await headers()).get("user-agent") ?? "unknown";
        const session = (await cookies()).get("session-id")?.value ?? "anonymous";
        await logUserAction({ session, userAgent, orderId: order.id });
    });

    return Response.json({ status: "success", id: order.id });
}
```

The callback runs after the response is done. According to the docs, `after` works in Server Components (including `generateMetadata`), Server Functions, Route Handlers and Proxy. It also runs when the response did not complete successfully, including when an error is thrown or when `notFound` or `redirect` is called. That makes it a good fit for audit trails and error-adjacent logging, and a poor fit for anything you only want to do on success. If that matters, check the outcome yourself before scheduling the work.

## Where request APIs are allowed

This is the part that trips people up, and it depends on the call site:

- **Route Handlers and Server Functions:** `cookies()` and `headers()` can be called directly inside the `after` callback, as in the example above.
- **Server Components (pages, layouts, `generateMetadata`):** they cannot. The docs explain that Next.js needs to know which part of the tree reads request data to support Partial Prerendering and Cache Components, and `after` runs outside React's rendering lifecycle. Calling `cookies()` or `headers()` inside the callback throws at runtime.

In a Server Component, read the values first and close over them:

```tsx
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { logUserAction } from "@/app/utils";

export default async function Page() {
    const userAgent = (await headers()).get("user-agent") ?? "unknown";
    const session = (await cookies()).get("session-id")?.value ?? "anonymous";

    after(() => {
        logUserAction({ session, userAgent });
    });

    return <h1>My Page</h1>;
}
```

With Cache Components, the same rule composes with `<Suspense>`. The docs show reading the cookie in a dynamic child component, calling `after` there with the value captured, and leaving the rest of the page in the static shell. Reading the cookie is what makes that child dynamic, not `after` itself.

## It does not make a route dynamic

The docs state that `after` is not a Request-time API, so calling it does not turn a route dynamic. There is a consequence worth reading twice: inside a static page, the callback executes at build time, or whenever the page is revalidated. So `after` in a statically rendered page is not "log every visit". If you want per-request analytics, put it in a Route Handler, a Server Function or Proxy, or in a component that is actually rendered per request.

## Deduplicating with React.cache

In Server Components, the docs note that React's `cache` can deduplicate functions called inside `after`, and that the callback reuses values already computed during the render. If your logging needs data the page already loaded, wrap the loader in `cache` rather than fetching again. Calls to `after` can also be nested, so you can write small wrapper utilities that schedule work with consistent behaviour.

## Self-hosting and serverless

Where this runs matters, because work after the response needs a runtime that stays alive.

| Deployment | Supported |
| --- | --- |
| Node.js server | Yes |
| Docker container | Yes |
| Static export | No |
| Adapters | Platform-specific |

For serverless, the docs explain that Next.js relies on a `waitUntil(promise)` primitive to extend an invocation until the promises settle. If you build your own platform integration, you must supply an equivalent that Next.js can reach through a request-context accessor on `globalThis`.

When you run `next start` yourself, [the self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) says `after` is fully supported. Shutdown is where teams get hurt: send `SIGINT` or `SIGTERM` and wait, and the server finishes in-flight requests and runs pending `after()` callbacks before exiting. The guide recommends a drain period of 10 to 30 seconds. In a container orchestrator, that means a termination grace period shorter than your slowest callback will cut the work off. Check that your `terminationGracePeriodSeconds` (or the Docker stop timeout) leaves room.

Duration is bounded too. `after` runs for the platform's default or configured maximum duration of the route, and where the platform supports it you can raise that limit with the `maxDuration` route segment config.

## Trade-offs

- **No delivery guarantee.** It is in-process work. If the process is killed hard, or the platform's limit is hit, the callback is lost. For anything you cannot afford to lose, such as billing events, write to a durable queue or database row inside the request, and use `after` only to kick off the slower processing.
- **No way to report back to the user.** The response is already gone. Errors inside the callback need their own handling and reporting, so wrap them and send them to your error tracker.
- **Don't move required work.** If the next page needs the written data (for example, a read-your-own-writes flow), keep the write in the request path. `after` is for work the response does not depend on.
- **Ordering and testing.** Because the callback runs later, tests that assert on side effects need to wait for it.

## When the original pattern is still right

Awaiting inline is correct when the result feeds the response, when you need the failure to surface to the caller, or when the write is the product of the request. A cheap synchronous counter increment is not worth restructuring either. Reach for `after` when the work is slow or variable, the response does not need its result, and losing it occasionally is acceptable or handled elsewhere.

## Sources

- [after – Next.js API reference](https://nextjs.org/docs/app/api-reference/functions/after)
- [How to self-host your Next.js application](https://nextjs.org/docs/app/guides/self-hosting)
