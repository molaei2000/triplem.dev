---
title: "Nuxt pro tip: useCookie is deep-watched by default, and secure or httpOnly can break hydration"
description: "useCookie renders the same value on server and client, but watch defaults to deep, nested edits need care, and secure or httpOnly can cause hydration mismatches."
date: 2026-11-23
cover: /images/blog/2026-11-23-nuxt-use-cookie.svg
tags: [nuxt, pro-tip, state-management]
draft: false
---

Nothing stable and substantial shipped in the last 72 hours. Vue's latest stable is 3.5.46 with 3.6.0-rc.16 as a pre-release, Vite has only an 8.4 beta, Node.js has a 27 alpha plus LTS patches, and the newest Nuxt release is still the 4.6.4 security patch. Release candidates and patches are not worth a post, so today is a Nuxt tip about a composable that looks trivial and has several options people leave at their defaults: `useCookie`.

## The common mistake

The usual use case is a preference the server needs to know about before the first paint: theme, locale, a dismissed banner. The mistake is to store it in `localStorage` or in a client-only ref, which the server cannot see. The page renders with the default, hydrates, then flips. `useCookie` exists for exactly this, because the request carries the cookie and the server can render with the real value.

```vue
<script setup lang="ts">
// Wrong: the server never sees this, so SSR always renders "dark"
const theme = ref("dark");
onMounted(() => {
    theme.value = localStorage.getItem("theme") ?? "dark";
});
</script>
```

```vue
<script setup lang="ts">
// Right: SSR reads the request cookie, the client reads document.cookie
const theme = useCookie<"dark" | "light">("theme", {
    default: () => "dark",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
});
</script>

<template>
    <button @click="theme = theme === 'dark' ? 'light' : 'dark'">{{ theme }}</button>
</template>
```

According to the [useCookie docs](https://nuxt.com/docs/4.x/api/composables/use-cookie), the composable returns a Vue `Ref` that works on both server and client: assigning to `.value` writes the cookie and reading it returns the current value. Values are serialized as JSON, and the composable only works inside the Nuxt context.

## Pitfall 1: watch is deep, not shallow

The `watch` option accepts `true`, `false` or `'shallow'`, and the default is `true`, which means a deep watch. That matters when the cookie holds an object or an array. With the default, mutating a nested property writes the cookie again. If you set `watch: 'shallow'`, only top-level changes are tracked, so a `push` is not saved until you reassign the value.

```ts
const list = useCookie<number[]>("list", {
    default: () => [],
    watch: "shallow",
});

function add(n: number) {
    list.value?.push(n); // not saved yet with 'shallow'
}

function save() {
    list.value &&= [...list.value]; // reassignment: saved
}
```

The docs use this as an example of shallow watching. The trade-off is that deep watching re-serializes on any nested change, while shallow gives you control over when the write happens, at the cost of forgetting to reassign. And `watch: false` is the way to read a cookie without ever writing it from reactive changes.

## Pitfall 2: readonly is not the same as watch: false

`readonly: true` blocks all writes on both server and client, and the docs note that the `default` value is still returned but never saved. `watch: false` only stops reactive changes from writing. If you want a cookie that is a pure input, such as a feature flag set by another system, `readonly` states that intent and enforces it.

```ts
const flags = useCookie("flags", {
    readonly: true,
    default: () => ({ beta: false }),
});
```

## Pitfall 3: secure and httpOnly versus hydration

Two options change who can read the cookie, and both are documented as hydration hazards:

- `secure: true` restricts the cookie to HTTPS. The docs warn that serving the page over plain HTTP can cause hydration errors, because the browser will not send the cookie back. This bites in local development behind HTTP and in staging environments without TLS.
- `httpOnly: true` hides the cookie from client-side JavaScript. If the client needs the value, hydration can be inconsistent, because the server saw it and the browser cannot.

The practical rule is to decide which side owns the cookie. A preference that both server render and client code read should be a plain, non-`httpOnly` cookie. A session token belongs to the server: set it from a Nitro route with h3 helpers, where `httpOnly` is natural, and never expose it through a client composable. The docs show the server-side counterpart:

```ts
// server/api/counter.get.ts
export default defineEventHandler((event) => {
    let counter = getCookie(event, "counter") || 0;
    setCookie(event, "counter", ++counter);
    return { counter };
});
```

## Pitfall 4: expiry does not slide on its own

Expiration is not renewed automatically. You have to assign to `.value`. Since v4.4 there is a `refresh` option: with `refresh: true`, each explicit assignment renews the expiry even if the value is unchanged. That gives a sliding session without inventing a changed value.

```ts
const visit = useCookie("visit", {
    maxAge: 60 * 60,
    refresh: true,
    default: () => "active",
});

visit.value = "active"; // same value, but the one-hour window restarts
```

Two more details from the docs. If you set both `expires` and `maxAge`, some clients ignore `expires`, so make them point to the same moment, or just use `maxAge`. And `expires` can be a function that runs on every write, so keep it free of side effects.

```ts
const token = useCookie("token", {
    expires: () => new Date(Date.now() + 60 * 60 * 1000),
});
```

## Pitfall 5: changes made elsewhere are not picked up

With watching enabled, the ref pushes your changes into the cookie, but it does not notice changes made elsewhere, such as another tab or server code. The docs point to `refreshCookie` for reloading the value from the cookie. If two tabs can change a preference, call it on a visibility or focus event rather than assuming the ref is current.

## Pitfall 6: custom encoding

By default the value goes through JSON and `encodeURIComponent` on write, and `decodeURIComponent` plus destr on read. You can supply `encode` and `decode`. If `decode` throws, the raw cookie string is returned instead of an error, so a malformed or tampered cookie reaches your code as a string even when you typed the ref as an object. Validate before you trust it:

```ts
const prefs = useCookie<{ density: "compact" | "roomy" }>("prefs", {
    default: () => ({ density: "roomy" }),
});

const density = computed(() =>
    typeof prefs.value === "object" && prefs.value?.density === "compact" ? "compact" : "roomy",
);
```

The decode fallback is documented, and the validation above is a defensive pattern built on it rather than something the docs prescribe.

## When the original pattern is fine

If a value is only used after hydration and never affects markup, such as a scroll position or a draft in a text field, `localStorage` is simpler and does not add bytes to every request. Cookies travel with every request to the matching path, which is the cost of letting the server see them. The docs do not state a size limit, so keep the payload small and store identifiers or short enums, not blobs.

## A checklist

1. Does the server need the value to render correctly? Use `useCookie`, with a `default`.
2. Is it an object? Decide between deep (default) and `'shallow'` and know which mutations persist.
3. Should the app never change it? Use `readonly`.
4. Is it a secret? Set it server-side with `httpOnly`, not through `useCookie` on the client.
5. Does it need a sliding window? Use `refresh: true` and assign on activity.
6. Can another tab change it? Plan a `refreshCookie` call.

## Sources

- [useCookie, Nuxt 4 docs](https://nuxt.com/docs/4.x/api/composables/use-cookie)
- [Nuxt releases on GitHub](https://github.com/nuxt/nuxt/releases)
- [Vue core releases on GitHub](https://github.com/vuejs/core/releases)
- [Vite releases on GitHub](https://github.com/vitejs/vite/releases)
- [Node.js blog](https://nodejs.org/en/blog)
- [Next.js blog](https://nextjs.org/blog)
