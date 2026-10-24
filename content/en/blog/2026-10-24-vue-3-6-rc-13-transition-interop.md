---
title: "Vue 3.6.0-rc.13: Vapor's Transition work gets a TransitionGroup bridge and smaller interop bundles"
description: "Vue 3.6.0-rc.13 shipped Oct 23 with Vapor rows inside a vdom TransitionGroup, a flat v-else-if chain, tree-shaken interop code and 34 bug fixes."
date: 2026-10-24
cover: /images/blog/2026-10-24-vue-3-6-rc-13-transition-interop.svg
tags: [vue, vapor]
draft: false
---

Vue [3.6.0-rc.13](https://github.com/vuejs/core/releases/tag/v3.6.0-rc.13) was published on October 23, a week after rc.12. It is still a pre-release; the [releases page](https://github.com/vuejs/core/releases) lists 3.5.44 as the latest stable version. The release page itself carries no notes and points at the changelog, so everything below comes from the [3.6 changelog](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md). The [rc.11 post](/blog/2026-10-11-vue-3-6-rc-11-vapor-warnings) covered the first Transition interop feature. rc.13 adds the second half and shows where the remaining bugs live.

## The one feature: Vapor rows in a vdom TransitionGroup

The single entry under Features is #15963: the rows of a Vapor slot can now be transitioned as children of a vdom `TransitionGroup`. In rc.11 the equivalent feature was a Vapor slot inside a vdom `Transition`. Together they cover the two animation wrappers you reach for when converting leaf components first.

A shape this is meant for, in a mixed app where the list shell is still vdom:

```vue
<!-- List.vue: vdom component -->
<template>
    <TransitionGroup name="row" tag="ul">
        <slot />
    </TransitionGroup>
</template>
```

```vue
<!-- Page.vue: slot content from a Vapor component -->
<template>
    <List>
        <Row v-for="item in items" :key="item.id" :item="item" />
    </List>
</template>
```

I have not run this exact pair, so treat it as an illustration of the boundary rather than a verified recipe. The changelog line only says Vapor slot rows work as children of a vdom `TransitionGroup`.

rc.12 had already fixed related edges: nested transition groups now account for ancestor movement (#15865), and deferred interop fragment removal waits until the leave completes (#15866).

## Transition and KeepAlive: the long tail

Most of the 34 bug-fix entries sit around transitions. They read as a list of timing edge cases rather than one root cause:

- **`out-in` mode:** skip the re-render of a transition unmounted mid-leave (#15919), don't make `out-in` wait for a branch that left to nothing (#15913), keep an `out-in` leave running when its transition unmounts (#15923), report errors from an `out-in` branch rendered during the leave to the error handler (#15941), and settle the enclosing outlet after an `out-in` branch resumes (#15942).
- **`in-out` mode:** keep a leave that a slot fallback's pending enter holds (#15949).
- **KeepAlive:** enter a kept-alive vdom child under the hooks of the switch (#15954).
- **Slots and `v-show`:** keep a `v-show` hidden root hidden through its structural leave (#15951), and switch sibling `v-if` roots of slot content as one transition child (#15945).
- **Single-root detection:** the child of a non-root `Transition` or `KeepAlive` is now marked as a single root in the compiler (#15988).

If you have components that combine `mode="out-in"` with async setup or `v-show`, these are the entries to read. Several of them cover a transition being torn down while it is running, which is the situation that tends to show up as a stuck element or a missing enter in production traffic, not in a happy-path demo.

## Async components and the 200ms delay

Two entries are not about transitions. #15950 restores the default 200ms delay of async loading components in `runtime-core`. The changelog does not say how it regressed or in which RC, so I cannot tell you whether you were affected. If you use `defineAsyncComponent` with a loading component and noticed a flash of the loading state in an earlier RC, this is the likely fix.

On the Vapor side, updates are now held back for a component whose root is pending async setup (#15925), and for a hydrated root chain over pending async setup (#15927). Transition hooks are also applied to a child's root rendered after its async setup (#15907, plus a relay variant for vdom hooks in #15908).

## Compiler: flatter v-else-if chains

The compiler gets three notable changes:

- Long `v-else-if` chains compile to a flat `createIfChain` (#15965). I do not know what the output looked like before, and the changelog gives no size or speed figure, so I will not claim a gain.
- `v-once` on `v-else-if` chains is aligned with vdom (#15966).
- Three entries without PR numbers deal with HTML parsing quirks: elements that break out of foreign content, text in table parts, and descendants that make the parser close an ancestor. These matter if you write templates that rely on browser-style recovery rules.

## Smaller bundles when you don't use interop

Two performance entries are the ones most worth a bundle check:

- `runtime-core` tree-shakes the Vapor interop code when `vaporInteropPlugin` is not used (#15990).
- `runtime-vapor` tree-shakes interop code for `Transition`, `KeepAlive` and `Suspense` when those components are not used (#15994).

rc.12 already added tree-shaking of hydration lookups of DOM node helpers in client bundles (#15875). The pattern is consistent: the interop layer is being made pay-as-you-go. No sizes are given, so measure it with your own bundle analyzer on a representative route.

## Smaller items

- `runtime-vapor` warns when a component was made reactive (no PR number listed).
- Number inputs are formatted on change (#15974).
- Line breaks are normalized when hydrating text (#15906).
- Custom element component creation is flushed together with its mount (#15991).
- `cloneVNode` extras fall through to the Vapor slot content root (#15989).
- From rc.12: watcher cleanups are preserved until the callback reruns (#15766), and `hasOwnProperty` works on props, attrs and slot props (#15841).

The rc.12 reactivity fix is the only entry outside the Vapor and compiler packages. It is a cleanup-ordering change, so any watcher that registers `onCleanup` is worth a test run.

## What to do with it

- **Production apps:** stay on 3.5.x. A release that still fixes `out-in` teardown and async setup ordering is not one to ship on.
- **Teams trialling Vapor:** upgrade a branch and exercise every animated list and route transition by hand, including quick interruption of a running transition. That is where most of this release's fixes land.
- **Library authors:** test components under both renderers with `Transition`, `TransitionGroup`, `KeepAlive` and slots, since the boundary is the active bug area.
- **Nuxt users:** I did not verify how Nuxt integrates with Vapor or with 3.6 pre-releases, so treat that as untested here.

## Trade-offs

Interop is what makes incremental migration possible, and it is also what makes Vapor large and subtle: every wrapper component needs a path for both renderers. rc.13 pays that cost down in two ways, by closing more timing gaps and by letting bundlers drop the interop code you never import. It does not remove the cost. The changelog has no breaking-change section, but this many transition and async-setup fixes in one RC are a reasonable signal that animated UI is the area to test first.

## Sources

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core release v3.6.0-rc.13](https://github.com/vuejs/core/releases/tag/v3.6.0-rc.13)
- [vuejs/core CHANGELOG (minor branch)](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md)
