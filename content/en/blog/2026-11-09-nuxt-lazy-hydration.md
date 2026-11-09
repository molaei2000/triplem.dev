---
title: "Nuxt pro tip: defer hydration with hydrate-on-visible, and know the props that silently undo it"
description: "Nuxt's Lazy components accept hydrate-on-* props that postpone hydration. Which strategy fits what, the caveats that force early hydration, and the data-payload option."
date: 2026-11-09
cover: /images/blog/2026-11-09-nuxt-lazy-hydration.svg
tags: [nuxt, pro-tip, performance]
draft: false
---

Nothing substantive shipped in the last 72 hours. The [Vue releases page](https://github.com/vuejs/core/releases) shows 3.5.45 as the latest stable and 3.6.0-rc.14 as a pre-release. The [Vite releases page](https://github.com/vitejs/vite/releases) shows 8.3.6, a patch. Both fall under patch or RC releases, which are not worth a post. The previous pro tip was about Next.js, so today is Nuxt: how to stop paying hydration cost for components nobody is looking at.

Everything below is checked against the [Nuxt 4.x components docs](https://nuxt.com/docs/4.x/directory-structure/app/components) and the [experimental features page](https://nuxt.com/docs/4.x/guide/going-further/experimental-features).

## The common mistake

A long landing page or article template is server-rendered, then the client hydrates every component on it: the footer newsletter form, the comments widget, the pricing calculator three screens down, a mobile-only drawer on a desktop viewport. Every one of those costs hydration work, including components the visitor may never reach.

Without a hydration strategy, all of them are treated alike.

```vue
<template>
    <ArticleBody :post="post" />
    <!-- Hydrates on load, even if the visitor never scrolls here -->
    <CommentsPanel :post-id="post.id" />
    <NewsletterForm />
</template>
```

## The improved pattern

Add the `Lazy` prefix and one `hydrate-*` prop. The strategy props apply to components with the `Lazy` prefix.

```vue
<template>
    <ArticleBody :post="post" />
    <LazyCommentsPanel :post-id="post.id" hydrate-on-visible />
    <LazyNewsletterForm hydrate-on-idle />
    <LazyMobileDrawer hydrate-on-media-query="(max-width: 768px)" />
</template>
```

The docs list seven strategies, and only one can be applied per component:

| Prop                    | Hydrates when                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `hydrate-on-visible`    | the component enters the viewport                                                   |
| `hydrate-on-idle`       | the browser is idle (optionally takes a max timeout as a number)                    |
| `hydrate-on-interaction`| a given event fires; with no value it defaults to `pointerenter`, `click`, `focus` |
| `hydrate-on-media-query`| the window matches the media query                                                  |
| `hydrate-after`         | a delay in milliseconds has passed                                                  |
| `hydrate-when`          | a boolean you control becomes true                                                  |
| `hydrate-never`         | never                                                                               |

The docs' own guidance on fit: `hydrate-when` for components that may not be needed at all, `hydrate-after` for ones that can wait a fixed time, and `hydrate-on-idle` for ones that can wait for an idle browser. `hydrate-on-visible` is the natural default for below-the-fold sections.

Every delayed component emits a `hydrated` event, which is useful for measuring when a strategy actually fires:

```vue
<script setup lang="ts">
function onHydrated() {
    performance.mark("comments-hydrated");
}
</script>

<template>
    <LazyCommentsPanel :post-id="post.id" hydrate-on-visible @hydrated="onHydrated" />
</template>
```

Use `hydrate-on-interaction` with care for anything the visitor might use quickly: the component hydrates only after the event, so check that the first click is not lost in your setup.

## The caveats that quietly defeat it

The docs list several conditions. These are the ones that bite in real projects:

- **Any prop change on a lazily hydrated component triggers hydration immediately.** That includes `hydrate-never` components. If you pass a reactive prop that changes right after mount (a clock, a "now" value, a store field that settles after load), the deferral is gone and you have only added indirection.
- **Shared `v-model` state.** Updating a model in one component can hydrate every component bound to it, so two siblings sharing a model are effectively one hydration unit.
- **Only in SFC templates.** The props must be written directly in the template. Spreading them with `v-bind` from an object doesn't work, and neither do direct imports from `#components`.
- **Not for above-the-fold content.** Deferring the hero or navigation just delays interactivity where the visitor looks first.
- **Don't use `hydrate-never` on anything interactive.** It is for genuinely static output.

A related note from the docs: if the component is rendered conditionally with `v-if="false"`, a normal lazy component may be enough.

## The data side: stripNeverHydratedData

A component's `useAsyncData` or `useFetch` result goes into the payload by default, whether or not the component hydrates promptly. The experimental features page documents two relevant options. `lazyHydration` is enabled by default and turns on the hydration strategies for `<Lazy>` components, and `compilerComponentResolution` (also on by default) applies the `hydrate-*` props during template compilation. If you ever need to rule them out while debugging, either can be set to `false`.

The third is `stripNeverHydratedData`. It applies `serialize: false` to `useAsyncData` and `useFetch` calls inside components that use `hydrate-never`, so their data stays out of `__NUXT_DATA__`. An explicit `serialize` option you set yourself takes precedence. The docs' example enables it with `true` and doesn't state a default, so treat it as opt-in.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    experimental: {
        stripNeverHydratedData: true,
    },
});
```

This only makes sense for content that is truly never interactive, such as a server-rendered legal block or a static related-posts list. It's experimental, so pin it behind a test that loads the page and checks the output.

## Trade-offs

- **Interaction latency moves, it doesn't vanish.** With `hydrate-on-visible`, the work happens when the visitor scrolls to the component. For a heavy component that can show up as a stutter during the scroll. `hydrate-on-idle` spreads the cost across idle time instead.
- **Measure first.** Open the Performance panel, find which components dominate hydration, and defer those. Wrapping everything adds strategy code and a failure surface for no gain.
- **Test the deferred path.** Behaviour that relies on a component being live at load (focus management, anchor links into a comments section, analytics hooks) can break when hydration waits.

When the original pattern is still right: anything above the fold, anything interactive immediately on load, and any component whose props change early.

## Sources

- [Nuxt 4.x docs: components, delayed (lazy) hydration](https://nuxt.com/docs/4.x/directory-structure/app/components)
- [Nuxt 4.x docs: experimental features](https://nuxt.com/docs/4.x/guide/going-further/experimental-features)
- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vitejs/vite releases](https://github.com/vitejs/vite/releases)
- [Nuxt blog](https://nuxt.com/blog)
- [Next.js blog](https://nextjs.org/blog)
