---
title: "Nuxt pro tip: contain widget failures with NuxtErrorBoundary instead of the full-screen error page"
description: "One broken widget should not replace your whole page. How NuxtErrorBoundary, clearError, createError and the vue:error hook split error handling, and where each one stops."
date: 2026-10-23
cover: /images/blog/2026-10-23-nuxt-error-boundary.svg
tags: [nuxt, pro-tip, error-handling]
draft: false
---

Nothing released in the last 72 hours was substantive enough to carry a post. The newest items I found were the Vue 3.6.0-rc.12 pre-release and Next.js 16.5 canaries. The Vue notes link to a changelog instead of describing changes, and the canaries are not stable. Vite 8.3.5 is already covered in an earlier post. So today is a Nuxt pro tip. The last tip was about Next.js, so Nuxt is next. The topic is error scope, which is easy to get wrong.

Everything below was checked against the [Nuxt error handling guide](https://nuxt.com/docs/4.x/getting-started/error-handling) and the [`<NuxtErrorBoundary>` reference](https://nuxt.com/docs/4.x/api/components/nuxt-error-boundary).

## The common mistake

A page has a core feature and a few secondary widgets: a recommendations rail, a comments panel, a third-party chart. A widget calls `showError()`, or an uncaught error in its setup reaches the top of the app. Either way the visitor loses the whole page to `error.vue`, and the article they came to read disappears because a sidebar failed.

`error.vue` is the right tool for page-level failure. It is a full-screen replacement that lives next to `app.vue`, receives the error as a prop, and can leave through `clearError({ redirect: '/' })`. It is the wrong tool when the failure is local.

```vue
<!-- pages/article/[slug].vue — the problematic shape -->
<script setup lang="ts">
const route = useRoute();
const { data: article } = await useFetch(`/api/articles/${route.params.slug}`);
if (!article.value) {
    throw createError({ status: 404, statusText: "Page Not Found" });
}
</script>

<template>
    <ArticleBody :article="article" />
    <!-- If this throws while rendering on the client, there is no local fallback. -->
    <RelatedRail :slug="route.params.slug" />
</template>
```

The 404 is correct there. Without the article, there is no page. The rail is the problem, because nothing scopes its failure.

## The improved pattern

Wrap the optional parts in `<NuxtErrorBoundary>`. According to the docs, it handles client-side errors that occur in its default slot. It stops the error from bubbling up and renders the `#error` slot instead. The slot receives `error` and `clearError`.

```vue
<template>
    <ArticleBody :article="article" />

    <NuxtErrorBoundary @error="reportWidgetError">
        <RelatedRail :slug="route.params.slug" />

        <template #error="{ error, clearError }">
            <aside role="status">
                <p>Related articles are unavailable right now.</p>
                <button type="button" @click="clearError">Try again</button>
            </aside>
        </template>
    </NuxtErrorBoundary>
</template>
```

`@error` fires when the default slot throws, which makes it a good place for a logger. If you need the error state from script rather than the template, give the component a template ref and read `errorBoundary.value?.error` or call `errorBoundary.value?.clearError()`. The reference page notes the component is built on Vue's `onErrorCaptured` hook.

## Know what "clear" means

The guide is specific here: setting `error` to `null` re-renders the default slot, but you must have resolved the underlying error first, or the error slot renders again. A "Try again" button that only calls `clearError` therefore works when the cause was transient or when your retry changes something, for example refreshing the data the widget depends on. It does nothing useful if the widget will throw the same way on every render.

```vue
<template #error="{ clearError }">
    <!-- Only useful if your retry first fixes the cause, e.g. re-requests the widget's data. -->
    <button type="button" @click="retryWidgetData().then(clearError)">Retry</button>
</template>
```

`retryWidgetData` is a placeholder for whatever re-fetch your widget needs.

Navigating to another route clears the error automatically, so a boundary does not stay stuck in its fallback across pages.

## Where each tool applies

| Situation | Tool |
| --- | --- |
| The page cannot exist (missing record, no permission) | `throw createError({ status, statusText })` in the page, rendered by `error.vue` |
| A non-critical subtree can fail independently on the client | `<NuxtErrorBoundary>` |
| You need to report everything, handled or not | `vue:error` hook, or `vueApp.config.errorHandler` in a plugin |
| You need to know whether an error page is showing | `useError()` in middleware |
| The app failed to start (plugins, `app:created`, SSR render) | `app:error` hook |

`createError` behaves differently on each side. On the server, a thrown error shows the full-screen error page. On the client it is non-fatal unless you pass `fatal: true`. That asymmetry is why the page-level 404 above belongs in the server-rendered path, not in a widget.

For reporting, the guide shows a plugin that hooks `vue:error`, which it describes as based on `onErrorCaptured` and firing when errors reach the top level. It also shows `vueApp.config.errorHandler`, which receives all Vue errors including handled ones, which is the better fit for an error-reporting service.

```ts
// plugins/error-reporting.ts
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
        // send to your reporting service
    };
    nuxtApp.hook("vue:error", (err) => {
        // errors that bubbled to the top level
    });
});
```

Choose one as your source of truth to avoid double counting. The two overlap, and the guide describes `errorHandler` as the one that sees handled errors too.

## Trade-offs and caveats

- **It is a client-side boundary.** The docs describe it as handling client-side errors. They do not document SSR behaviour for the component, and I have not verified it, so do not rely on it to absorb a server render failure. Keep server-side failures flowing to `createError` and `error.vue`, and test the SSR path yourself before depending on a boundary there.
- **A boundary hides failures from visitors, not from you.** Wire up `@error` or a global handler. A silent fallback that nobody logs is a bug that lives forever.
- **Do not wrap everything.** If every component has its own boundary, a genuinely broken page renders as a grid of apologies. Boundaries belong around independent, optional regions. Core content should still fail loudly.
- **Fallbacks need design.** Reserve space for the fallback so a failure does not shift layout, and give it an accessible role as in the example above.
- **Documented gaps.** The reference page lists no props and no caveats, so anything beyond the events, the slot and the template-ref access shown above should be read from the component's source before you build on it.

## When the original pattern is fine

For a single-purpose page, such as a checkout step or a login form, where a failed region means the page has no value, the full-screen `error.vue` is the honest result. A boundary would only show a partial page that cannot work. Use boundaries when the rest of the page still has value on its own.

## Sources

- [Nuxt docs: Error handling](https://nuxt.com/docs/4.x/getting-started/error-handling)
- [Nuxt docs: `<NuxtErrorBoundary>`](https://nuxt.com/docs/4.x/api/components/nuxt-error-boundary)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Next.js releases](https://github.com/vercel/next.js/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
