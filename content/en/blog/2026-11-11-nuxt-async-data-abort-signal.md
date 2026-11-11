---
title: "Nuxt pro tip: forward the signal from useAsyncData to $fetch, or cancel dedupe cancels nothing"
description: "useAsyncData defaults to dedupe: 'cancel', but the abort only reaches the network if your handler forwards its signal. Here is the wiring, timeout and clear included."
date: 2026-11-11
cover: /images/blog/2026-11-11-nuxt-async-data-abort-signal.svg
tags: [nuxt, pro-tip, data-fetching]
draft: false
---

Nothing substantive landed in the last 72 hours beyond patch releases, so today is a pro tip. It is about a default you already rely on without having verified it does what you think: how `useAsyncData` and `useFetch` cancel superseded requests.

## The common mistake

A search box, a filter panel or a paginated table calls `refresh()` or changes a watched key faster than the server answers. You assume the older request is cancelled. With a handler written like this, only half of that is true:

```ts
const query = ref("");

const { data, status } = await useAsyncData(
    "search",
    () => $fetch("/api/search", { query: { q: query.value } }),
    { watch: [query] },
);
```

The [`useAsyncData` reference](https://nuxt.com/docs/4.x/api/composables/use-async-data) documents `dedupe` as the policy for when an execution is triggered more than once at a time, with two values, `'cancel'` and `'defer'`, and `'cancel'` as the default. It also documents that the handler's `signal` is aborted when a new request starts with `dedupe: 'cancel'`. The handler above never reads that signal, so there is nothing connected to the HTTP request. Nuxt can mark the older call as superseded, but the browser keeps the connection open and your server keeps working on a query nobody wants.

## Why it matters

Every handler receives two arguments: the `nuxtApp` and an options object containing an `AbortSignal`. The documented type is:

```ts
type AsyncDataHandler<ResT> = (
    nuxtApp: NuxtApp,
    options: { signal: AbortSignal },
) => Promise<ResT>;
```

The docs state that `$fetch` supports abort signals natively, so passing the signal through is enough. Without it, "cancel" is bookkeeping on the Nuxt side. With it, the request is actually aborted.

For a typeahead that fires on every keystroke, the difference is real server load and real bandwidth on slow mobile connections, not a theoretical purity win. I have not benchmarked it here; the point is only that an unforwarded signal leaves the work running.

## The improved pattern

Take the second argument and hand it to `$fetch`:

```ts
const query = ref("");

const { data, status } = await useAsyncData(
    "search",
    (_nuxtApp, { signal }) => $fetch("/api/search", { query: { q: query.value }, signal }),
    { watch: [query] },
);
```

The [data fetching guide](https://nuxt.com/docs/4.x/getting-started/data-fetching) uses the same shape in its own examples, passing `signal` from the handler's second argument into `$fetch`.

If you use `useFetch`, you mostly do not need to do this yourself. It is the wrapper around `useAsyncData` and `$fetch` that the [`useFetch` reference](https://nuxt.com/docs/4.x/api/composables/use-fetch) describes, and it takes the same `dedupe` option with the same default. The manual wiring matters when you write the handler yourself: a custom client, a GraphQL call, an SDK that exposes its own method.

### When your client has no signal support

The docs cover this case too: if the handler does not support signals, you can listen for the `abort` event on `signal` and reject the promise yourself. That makes the Nuxt-side promise settle promptly, but it cannot stop work the SDK already started. Check whether the client accepts a signal before assuming cancel means cancelled.

## Other ways a request gets aborted

According to the reference, the handler's signal is aborted in three situations:

- a new request is made with `dedupe: 'cancel'`;
- `clear` is called;
- the `timeout` duration is exceeded.

That makes a timeout nearly free once the signal is forwarded:

```ts
const { data, error, refresh } = await useAsyncData(
    "report",
    (_nuxtApp, { signal }) => $fetch("/api/report", { signal }),
    { immediate: false },
);

// timeout is in milliseconds; undefined (the default) means no timeout
await refresh({ timeout: 5000 });
```

`timeout` is part of `AsyncDataExecuteOptions` alongside `dedupe` and `signal`, so you can set it per call. The reference notes it was added in v4.2, so check your version first.

`clear` is the right call on unmount-like transitions where the result is no longer wanted: per the docs it cancels pending calls and resets `data` to `undefined` (or your `default()` value), `error` to `undefined` and `status` to `idle`. Do not use it when you want to keep the stale data on screen; for that, the docs say that flipping `enabled` from true to false cancels an in-flight request without clearing `data`.

## Cancelling on user intent

`refresh` also accepts your own `signal`, which is useful for a visible Cancel button on a slow export or report:

```ts
let controller: AbortController | undefined;

function start() {
    controller = new AbortController();
    refresh({ signal: controller.signal });
}

function cancel() {
    controller?.abort();
}
```

This mirrors the example in the reference. Calling `abort()` aborts the ongoing refresh, provided the handler forwarded its signal.

## Choosing between cancel and defer

Be careful here, because the documentation is thin. The reference lists `'defer'` as a value but only describes `dedupe` as "policy when triggering an execution more than once at a time"; it does not spell out what `defer` does. It also says that by default Nuxt waits for a `refresh` to finish before it can run again, and it does not tie that sentence to `defer`. I am not going to guess at the exact semantics.

What you can reason about from the documented `cancel` behaviour:

- **`cancel` (default)** fits latest-wins inputs: search, filters, sorting, anything where the older response is worthless the moment a newer request exists.
- **`defer`** exists for the opposite situation, where you do not want a second trigger to abort work in progress. Before depending on it, read the source or test it against your version, since the docs do not say what happens to the second call.

The [guide](https://nuxt.com/docs/4.x/getting-started/data-fetching) also says `dedupe` is one of the options that can safely differ between calls sharing a key, so you can use `refresh({ dedupe: "defer" })` for one button without changing the composable's default.

## Trade-offs and caveats

- **Aborted is not rolled back.** A signal stops your client waiting and, usually, the transport. A mutation that already reached the server may still complete. Do not use cancel as a safety mechanism for writes.
- **Aborts surface as errors in some code paths.** Test how your error handling treats a cancelled call so a superseded request does not flash an error state in the UI. The reference does not describe what `data` or `error` do for a cancelled call, so verify in your own app.
- **A stable key still matters.** Cancellation applies to executions of the same key. If you build keys from the query, a new key is a new entry, not a superseded request, so choose between a constant key plus `watch`, or reactive keys, on purpose. The guide documents both.
- **The original pattern is fine** for a one-shot fetch that is never refreshed or watched. Nothing can supersede it, so forwarding the signal buys little, though it costs nothing either.

## Checklist

1. Search your codebase for `useAsyncData(` handlers that ignore their second argument.
2. Forward `signal` into `$fetch` or whichever client you use.
3. Add `timeout` to calls that sit behind slow upstreams.
4. Decide per call whether the latest wins (`cancel`) or the first should finish.

## Sources

- https://nuxt.com/docs/4.x/api/composables/use-async-data
- https://nuxt.com/docs/4.x/api/composables/use-fetch
- https://nuxt.com/docs/4.x/getting-started/data-fetching
- https://nuxt.com/blog
- https://nextjs.org/blog
- https://github.com/vitejs/vite/releases
- https://github.com/vuejs/core/releases
- https://devblogs.microsoft.com/typescript/
