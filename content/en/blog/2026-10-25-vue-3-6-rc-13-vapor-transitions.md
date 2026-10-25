---
title: "Vue 3.6.0-rc.13: Vapor's Transition and KeepAlive interop gets a cleanup, and unused interop code is tree-shaken"
description: "Vue 3.6.0-rc.13 (Oct 23) is mostly Transition, KeepAlive and async-setup fixes for Vapor, plus tree-shaking of interop code. What changed and what to test."
date: 2026-10-25
cover: /images/blog/2026-10-25-vue-3-6-rc-13-vapor-transitions.svg
tags: [vue, vapor]
draft: false
---

Vue [3.6.0-rc.13](https://github.com/vuejs/core/releases) was published on October 23, a week after rc.12. It is still a pre-release; the [releases page](https://github.com/vuejs/core/releases) lists 3.5.44 as the latest stable version. The [3.6 changelog](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md) for this tag has about forty entries, and most of them are about one subject: what happens to a Vapor component while a `<Transition>`, `<KeepAlive>` or async `setup()` is in flight. Earlier posts covered [rc.10](/blog/2026-10-02-vue-3-6-rc-10-vapor-fixes) and [rc.11](/blog/2026-10-11-vue-3-6-rc-11-vapor-warnings); this one skips what they said.

## The theme: lifecycle edges under Transition

The `runtime-vapor` section reads like a list of race conditions being closed. A selection, all taken from the changelog:

- **out-in mode.** Out-in no longer waits on a branch that left to nothing (#15913). It keeps a leave running when its transition unmounts (#15923), reports errors from an out-in branch rendered from the leave to the error handler (#15941), and settles the enclosing outlet after a branch resumes from its leave (#15942). In `runtime-core`, a transition unmounted mid-leave now skips its out-in re-render (#15919).
- **in-out mode.** An in-out leave held by a slot fallback's pending enter is kept (#15949).
- **Async setup.** Transition hooks now apply to a child's root that renders only after async setup (#15907), and vdom transition hooks are relayed to it (#15908). Updates to a component whose root is pending async setup are held back (#15925), as are updates to a hydrated root chain (#15927). Hydration appear is skipped for a Transition child that renders its root later (#15911).
- **KeepAlive.** A kept-alive vdom child enters under the hooks of the switch (#15954).
- **v-show.** A `v-show`-hidden root stays hidden through its structural leave (#15951).
- **Slots.** Sibling `v-if` roots of slot content switch as one transition child (#15945), and a slot branch that is leaving keeps the relayed hooks of a vdom transition (#15916).

The one feature is in the same area: the rows of a Vapor slot can now be transitioned as children of a vdom `TransitionGroup` (#15963). Combined with the rc.11 feature that let Vapor slot content sit inside a vdom `Transition`, the interop story for animated lists is getting filled in from both directions.

Why this matters: transitions are where a renderer's ordering assumptions get tested. A fine-grained renderer that updates DOM directly has to decide when a node is "still there" while its leave animation runs, and when a pending async root counts as mounted. The size of this list suggests those semantics were not settled at rc.12, and there is no guarantee they are at rc.13.

## A pattern that touches several of these fixes

The shape that most of these entries describe is a switched view with an async child, inside a Vapor-compiled component:

```vue
<script setup vapor lang="ts">
import { defineAsyncComponent, ref } from "vue";

const tab = ref<"summary" | "details">("summary");
const Details = defineAsyncComponent(() => import("./Details.vue"));
</script>

<template>
    <Transition name="fade" mode="out-in">
        <KeepAlive>
            <Details v-if="tab === 'details'" />
            <p v-else>Summary</p>
        </KeepAlive>
    </Transition>
</template>
```

I wrote this example myself to show the combination (out-in, KeepAlive, an async branch). I did not run it against rc.13, and I cannot tell you which of the fixes above it would hit. It is a useful regression fixture: if your app has this shape and you saw flicker, a stuck leave or a missing enter on rc.12, rerun it on rc.13.

## Compiler fixes

Several `compiler-vapor` entries are also not about transitions:

- Long `v-else-if` chains now compile to a flat `createIfChain` (#15965). The changelog states the change but gives no size or speed numbers, so treat the motivation (avoiding deep nesting) as my reading, not the maintainers' claim.
- `v-once` on `v-else-if` chains is aligned with the vdom (#15966).
- Object-shorthand aliases with default or computed keys get a key (#15953).
- Three entries deal with the HTML parser edge cases of foreign content and table parts: breakout elements are created imperatively, a descendant gets its own template when the parser would close an ancestor, and the end tag of a special element is kept under a parent that cannot close it. If you have templates with SVG, MathML or odd table markup, these are the ones to retest.
- The child of a non-root `Transition` or `KeepAlive` is marked as a single root (#15988).

## Other runtime fixes

- `runtime-core` restores the default 200ms delay for async loading components (#15950). The word "restores" implies the delay had been lost earlier in the 3.6 line, but the changelog does not say when or in which renderer, so check any loading placeholder timing you tuned on an earlier RC.
- Number inputs are formatted on change (#15974).
- Line breaks are normalised when hydrating text (#15906). This one matters for SSR output containing text with `\r\n`, though the changelog does not give a concrete failing case.
- `v-for` sources keep refs as row items, and redundant ref checks for `v-for` items are avoided.
- A dev warning now fires when a component was made reactive.
- Custom element component creation is flushed with its mount (#15991).
- Render-effect measurement only counts the outermost run of a component (#15993). I assume this concerns performance tooling, but the entry does not say so.

## Tree-shaking: the part that affects bundle size

Three performance entries are the reason to read the release even if you do not use Vapor yet:

- `runtime-core` tree-shakes Vapor interop code when `vaporInteropPlugin` is not used (#15990).
- `runtime-vapor` tree-shakes Transition, KeepAlive and Suspense interop code when those components are not used (#15994).
- Redundant ref checks for `v-for` items are avoided.

For a vdom-only app, the first matters: the interop layer no longer has to ride along unless you install the plugin. I have not measured bundle output, and the changelog gives no figures, so verify with your own analyzer. A quick way is to build twice on the same commit, once on the previous RC and once on rc.13, and compare the chunk that holds `vue`.

## Compatibility and risk

There is no breaking-changes section in this changelog segment. Behaviourally, the riskiest change for existing code is probably the restored 200ms async-loading delay, because it affects UI timing in apps that already adapted to whatever the RCs did before. The Transition fixes are more likely to remove workarounds than to require new ones.

## What to do

- **Production apps:** stay on 3.5.x. A release that is still ordering out-in leaves, KeepAlive enters and pending async roots is not at the point where you ship it.
- **Teams trialling Vapor:** upgrade on a branch and test every `<Transition>` that wraps an async or kept-alive child. Check enter and leave in both modes, with and without `v-show`, and test hydration separately.
- **Library authors:** run animated components under both renderers, since the fixes are mostly about the boundary between them.
- **Nuxt users:** I did not verify how Nuxt integrates with Vapor, so I am not claiming anything about it.

## Trade-offs

Every rc.13 fix is an argument for Vapor's design and against it at once. Direct DOM updates remove vdom work, but the lifecycle guarantees the vdom gave for free (a node stays until its leave ends, a root counts as mounted once setup resolves) now have to be rebuilt case by case. The tree-shaking entries show the project is also working to keep that cost off apps that opt out. Neither is a reason to switch mid-RC; both are good reasons to read the changelog before you do.

## Sources

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core CHANGELOG (minor branch)](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md)
