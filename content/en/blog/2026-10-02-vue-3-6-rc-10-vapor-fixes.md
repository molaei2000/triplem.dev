---
title: "Vue 3.6.0-rc.10: what the Vapor fix stream tells you"
description: "Vue 3.6.0-rc.10 shipped on Sept 30 with another round of Vapor fixes. What changed, what Vapor still cannot do, and what to check before you opt in."
date: 2026-10-02
cover: /images/blog/2026-10-02-vue-3-6-rc-10-vapor-fixes.svg
tags: [vue, vapor]
draft: false
---

Vue [3.6.0-rc.10](https://github.com/vuejs/core/releases) was published on September 30, two weeks after rc.9. It is a pre-release, and the latest stable release on the releases page at the time of writing is 3.5.43. Almost everything in rc.10 sits in the Vapor packages. That tells you where the remaining risk in 3.6 is, even though the release isn't flashy.

## What changed in rc.10

Going by the [3.6 changelog](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md), the rc.10 entries fall into three groups.

**Compiler (`compiler-vapor`)**

- Native element `on*` keys are now bound as listeners, as the vdom compiler does (#15695).
- SVG elements are detected by namespace in prop codegen (#15656).
- Attribute decoding and prop folding got further fixes.

**Runtime (`runtime-vapor`)**

- Evaluated props and dynamic slots are now delivered to components (#15708).
- A root's own listeners are merged with the fallthrough ones (#15688).
- Hydration and vdom interop got further work, including slot rendering, component patching and CSS variables.

**Server renderer**

- Empty Vapor slot forwarding and slot outlet rendering were fixed.

The only performance entry is that a root template's class and style are now resolved on first use.

rc.9 (September 18) had the same profile: expression caching, `v-for` selector handling, hydration, `v-show` alignment, `KeepAlive`, and #15506, which marks props as shallow so that watching props is no longer deep. The changelog lists no breaking changes for this release cycle.

## Why it matters

Look at what the fixes touch: fallthrough attributes, listener merging, slot delivery, hydration, SVG. These are the places where a compiler that emits direct DOM operations has to match the behaviour of a vdom renderer. The core reactive path isn't in the list. Two things follow.

1. **Behavioural parity bugs sit at component boundaries.** If your components rely on attribute fallthrough with listeners on the root, dynamic slots, or SSR hydration, those are the exact paths still being fixed. Test them.
2. **Listener semantics were still moving at rc.10.** Binding `on*` keys like the vdom does is a semantic change, not a cleanup. If you wrote workarounds for earlier Vapor behaviour, re-check them.

## How you opt in

Vapor is opt-in. A [third-party RC upgrade guide](https://blog.sparkles-editor.com/en/blog/vue-3-6-rc-upgrade-guide) describes three levels. I could not load the official Vapor page, so verify these against the Vue docs before using them.

A pure Vapor app avoids the vdom runtime:

```ts
import { createVaporApp } from "vue";
import App from "./App.vue";

createVaporApp(App).mount("#app");
```

A mixed app installs the interop plugin and opts in per component:

```ts
import { createApp, vaporInteropPlugin } from "vue";
import App from "./App.vue";

createApp(App).use(vaporInteropPlugin).mount("#app");
```

```vue
<script setup vapor lang="ts">
// this component compiles in Vapor mode
</script>
```

The guide also mentions `<script vapor>` and `<template vapor>` as alternative forms.

For an existing app, the mixed route is the realistic one. You convert leaf components first and leave the rest on the vdom, so the interop layer is where most of your exposure sits. That layer is the area the rc.10 fixes touch most.

## What Vapor still doesn't support

The same guide lists these limits, which matter more than any fix when you plan a migration:

- The Options API is not supported.
- `getCurrentInstance()` returns `null`.
- `app.config.globalProperties` is unavailable.
- Render functions and JSX stay vdom-only.
- `v-memo` is unsupported.
- Template refs to Vapor components don't expose `$el`, `$props`, `$attrs` or `$slots`.

The last item is the one most likely to catch you. Parent code that reaches into a child via a template ref and reads `$el` will break when the child converts. Libraries that use `getCurrentInstance()` or `globalProperties` will break in the same way, so check your dependency tree, not just your own code.

The guide also says 3.6 rebuilds the dependency-propagation layer on alien-signals, with a public API it describes as unchanged and a memory reduction of about 13%. That number comes from the guide with no workload or methodology attached, so don't plan around it. Measure your own app.

## A caveat that bites between RCs

The same guide says rc.1 auto-delegated events to `document`, while rc.2 binds listeners directly by default. It recommends using the `.delegate` modifier only when you want document-level delegation, and removing any `compilerOptions.eventDelegation` config left over from rc.1. If you tried Vapor early and have not revisited your setup, check for that option.

## What to do with it

- **Production apps:** stay on 3.5.x. The release is still a candidate, and the changelog shows fixes landing in basic areas such as prop delivery and listener merging.
- **Greenfield or internal tools:** a pure Vapor app is reasonable if you accept the unsupported list above and can pin the exact RC.
- **Library authors:** this is the time to run your components under both renderers. Anything built on instance proxies, `getCurrentInstance()` or `globalProperties` is the first thing to break.
- **Nuxt users:** I did not verify Nuxt integration, so treat that as untested here.

## Trade-offs

The case for Vapor is less runtime work per update and a smaller shipped runtime, but this post doesn't rely on any benchmark for that. The cost is a split ecosystem for a while. You will have two component models, an interop layer, and a list of vdom-era APIs that don't apply. A steady stream of parity fixes is what you would expect at this stage. It also means the RC label is accurate.

## Sources

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core CHANGELOG (minor branch)](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md)
- [The Complete Vue 3.6 RC Upgrade Guide](https://blog.sparkles-editor.com/en/blog/vue-3-6-rc-upgrade-guide)
