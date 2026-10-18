---
title: "Vue 3.6.0-rc.12: Vapor's Transition and KeepAlive edge cases get a second pass"
description: "Vue 3.6.0-rc.12 landed Oct 16 with a watcher-cleanup fix, a dozen Vapor Transition and KeepAlive corrections, and a smaller hydration bundle. What to test."
date: 2026-10-18
cover: /images/blog/2026-10-18-vue-3-6-rc-12-vapor-transitions.svg
tags: [vue, vapor, reactivity]
draft: false
---

Vue 3.6.0-rc.12 was tagged on October 16, six days after [rc.11](/blog/2026-10-11-vue-3-6-rc-11-vapor-warnings). The [releases page](https://github.com/vuejs/core/releases) still marks 3.5.44 (October 13) as the latest stable version, and rc.12 as a pre-release. The [3.6 changelog](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md) lists no features this time, one reactivity fix, a pile of `runtime-vapor` and `vapor` fixes, and one performance entry. The theme is clear from the titles: animated and cached subtrees, the places where a renderer that skips the virtual DOM has to reproduce ordering the vdom got for free.

## The one reactivity fix: watcher cleanups

Under `reactivity`, the single entry is "preserve watcher cleanups until the callback reruns" (#15766, closing #15765). The changelog gives no further description, so I can't say what the exact failure looked like. The title does tell you what the contract is: a cleanup registered in a watcher callback should stay alive until the next run of that callback, rather than being dropped earlier.

That is the behaviour most code already assumes:

```ts
import { watch, onWatcherCleanup, ref } from "vue";

const query = ref("");

watch(query, (q) => {
    const controller = new AbortController();
    onWatcherCleanup(() => controller.abort());
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
});
```

I did not verify whether this fix is also backported to the 3.5 line, and the 3.5.44 notes I have are only a pointer to the changelog. If you rely on cleanup timing for aborts or subscriptions, add a test that asserts the order, then run it against both versions.

## Transition and KeepAlive: where most of the release goes

Eight of the thirteen `runtime-vapor` fixes concern `Transition`, `TransitionGroup` or `KeepAlive`:

- Nested transition groups now account for ancestor movement (#15865).
- Interop fragment removal waits until the leave finishes (#15866).
- A deactivation leave completes when the element sits after a `KeepAlive` move (#15846).
- The deferred `out-in` branch renders when the fragment follows a `KeepAlive` move (#15844).
- A slot fallback resolves immediately when its content is empty under `out-in` (#15890).
- An `in-out` leave that no entering element claims still runs (#15849).
- A kept-alive branch's `in-out` leave starts after the incoming enter (#15895).
- Slot outlet branch switches under `Transition` count as structural (#15897).

These read like the output of someone running combinatorial cases: `out-in` and `in-out` crossed with `KeepAlive`, slot fallbacks and interop fragments. A typical component that hits several at once looks like this:

```vue
<script setup vapor lang="ts">
import { shallowRef } from "vue";
import Overview from "./Overview.vue";
import Billing from "./Billing.vue";

const tab = shallowRef(Overview);
</script>

<template>
    <button @click="tab = tab === Overview ? Billing : Overview">Switch</button>
    <Transition name="fade" mode="out-in">
        <KeepAlive>
            <component :is="tab" />
        </KeepAlive>
    </Transition>
</template>
```

A tab panel with a transition around cached views is ordinary UI, and the fact that several fixes target the combination suggests rc.11 and earlier were not safe there. I have not reproduced any of these bugs; my reading comes only from the changelog titles.

## Smaller Vapor fixes worth scanning

- **Props and slots:** `hasOwnProperty` now works on props, attrs and slot props (#15841, closing #15840). Anything doing `Object.hasOwn(props, "x")` or `props.hasOwnProperty("x")` benefits.
- **Unmount:** a block node is removed from its actual `parentNode` (#15867, closing #15861).
- **Lists:** an invalid `v-for` range renders nothing in production (#15863).
- **Warnings:** warning context is pushed during render effect updates (#15874). The practical effect is better component stacks in dev warnings, which fits the warning work in rc.11.
- **Compiler (`vapor`):** destructure defaults apply at their own level (#15860), keyed slot outlet identity is preserved (d7c0ab5), and inline mode returns bindings for `render` in a normal script (#15780).
- **SSR:** children of a dynamic native element render like a static one (#15852, closing #15845).
- **Interop:** a Vapor slot vnode inside a vdom outlet starts on its own node (#15850).

The destructure-defaults fix is the one that can silently change values: if you destructure props with defaults at several levels in a Vapor component, compare rendered output before and after.

## The performance entry

`runtime-vapor` now tree-shakes hydration lookups of DOM node helpers in client bundles (#15875). In plain terms, apps that don't hydrate shouldn't carry that code. The changelog gives no size number and I have no measurement, so check your own bundle with a visualizer before and after rather than assuming a gain.

## What it means for a real project

- **Production on 3.5.x:** nothing changes. Stay on the stable line.
- **Trialling Vapor in a mixed app:** rc.12 is worth installing on a branch if you animate route or tab changes. Re-test every `Transition` that wraps `KeepAlive`, `v-if` slot content, or `TransitionGroup`.
- **Library authors:** the interop entries (#15866, #15850) are the ones that affect components shipped to both renderers. Run your visual or E2E tests against vdom and Vapor.
- **Nuxt users:** I did not verify how Nuxt's current release treats 3.6 pre-releases, so don't read this post as a statement about Nuxt compatibility.

## Trade-offs

Every rc in this series closes bugs in places where Vapor's model (direct DOM updates without a virtual tree to diff) has to rebuild guarantees by hand. Animation ordering is the hardest of those, because it depends on when nodes are inserted, kept, and removed. A release made mostly of such fixes is a good sign for convergence, and also evidence that the surface is not yet settled. Pre-release status is the right label: the next RC may touch the same code.

## Sources

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core CHANGELOG (minor branch)](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md)
