---
title: "Vue 3.5.44: reactivity, Suspense and transition fixes worth reading before you upgrade"
description: "Vue 3.5.44 landed on 13 October with 25 bug fixes: watcher dependency tracking, once watchers, v-html falsy values, Suspense, Teleport and hydration. What to check."
date: 2026-10-15
cover: /images/blog/2026-10-15-vue-3-5-44-reactivity-fixes.svg
tags: [vue, reactivity]
draft: false
---

Vue [3.5.44](https://github.com/vuejs/core/releases) shipped on 13 October and is marked as the latest stable release. It follows 3.5.43 (17 September) and lands while the 3.6 line is still in release-candidate mode, so the 3.5 branch is still where production fixes go. The [changelog](https://github.com/vuejs/core/blob/main/CHANGELOG.md) lists bug fixes only, 25 of them. Most are edge cases, but a handful change behaviour that real code can depend on, and those deserve a look before you bump the lockfile.

## Reactivity: three behaviour changes

These are the entries I would read twice.

**Watcher callbacks no longer track dependencies when run inside another effect** (#15782, closes #5009). The changelog describes it only in those terms. The likely reading: reads inside a watcher callback that runs within an outer effect should stop being tracked by that outer effect. Code that accidentally relied on the extra tracking may stop re-running, so test nested watcher cases.

**A `once` watcher now stops when its callback throws** (#15755). The changelog gives only the one-line title, so check the PR for details. The implication is that a throwing callback now ends the watcher's life:

```ts
import { ref, watch } from "vue";

const token = ref<string | null>(null);

watch(
    token,
    (value) => {
        if (!value) return;
        parseClaims(value); // may throw
    },
    { once: true },
);
```

If you used `once` as "run the first time this is truthy, retry on failure", don't count on a retry after a throw. Catch inside the callback if you need to keep going.

**Native array iterators are no longer mutated** (#15703, closes #15643) and **shallow collection semantics are preserved** (#15793, closes #15792). Both are about the proxies reactivity hands out. If you have `shallowReactive` or `shallowRef` collections, re-run the tests that touch them.

## Compiler and SFC changes

- `v-html` now renders `0` and `false` as strings (#15571). Audit any `v-html` binding that can be `0` or `false` and confirm the output is what you want.
- The `v-memo` cache guard wraps the `v-for` key in parentheses (#15724, closes #15723). That is a compile-output fix for keys that are expressions.
- The SFC compiler reports an error when `defineModel` options reference a destructured prop (#15604, closes #15602). This one can break a build that used to pass:

```vue
<script setup lang="ts">
const { min = 0 } = defineProps<{ min?: number }>();

// Now a compile error: the options reference a destructured prop.
const model = defineModel<number>({ default: min });
</script>
```

The changelog only says the compiler now reports an error here, so a build that used to pass may fail. Use a literal default, or derive the value after the model exists.

- `v-show` gets its persisted transition injected in production builds (#15783).

## Runtime-core: queue and props

Two fixes touch the scheduler and the patch path:

- Only jobs queued by the root render itself are flushed (#15757, closes #6728). The flush is now scoped to the render's own jobs, so don't rely on a render flushing unrelated queued work.
- Full-props comparison now detects new prop keys (#15634, closes #15632). The fix targets cases where a newly added prop key went unnoticed.

Also in the list: an invalid `v-for` range renders nothing in production (#15742), and the async placeholder is kept for block patching and pending component updates (#15554, closes #15551).

## Suspense, hydration, Teleport and transitions

This is the bulk of the release and the area that has been getting steady fixes since 3.5.42 (27 August):

- Suspense: a resolved async component is mounted with its own namespace (#15640), and async components that are unmounted while pending are no longer rendered.
- Hydration: `hydrateOnVisible` now observes children of a `display: contents` root (#15773).- Teleport: `targetStart` is moved and children stay before `targetAnchor` (#15818, closes #15817).
- Transitions: comment-wrapped component roots are handled (#15853, closes #6080, #5500), and nested `TransitionGroup`s are measured against their moving outer item (#15848, closes #5385, #1531).
- KeepAlive: a pruned current component is unmounted when its vnode was cloned on mount (#15711).
- Custom elements: an async custom element removed while loading is no longer mounted (#15777).
- SSR: async setup errors propagate from the server renderer (#15857, closes #15716) and falsy vnode content overrides are honoured (#15769).

Server-side error propagation is the one to notice for Nuxt and other SSR apps. Async `setup` errors now propagate from the server renderer, so watch your logs and error pages after upgrading.

Smaller items: `playsinline` is a boolean attribute (#15627), `v-show` keeps its display value for unchanged style strings (#15794), and the Vue 2.7 compat build exposes `_setupProxy` (#15618).

## How to upgrade

This is a patch release, but the reactivity and compiler entries are behaviour changes. A sensible order:

1. Bump and run the type check and build first. The `defineModel` error will show up there rather than at runtime.
2. Grep for `once: true` watchers and for `watch` callbacks that read state an outer computed also uses.
3. Check any `v-html` binding that can be `0` or `false`.
4. Watch the server logs on the first deploy for newly surfaced async setup errors.

## Trade-offs

Patch releases that tighten semantics are the right call, but they are not free. Fixes like the watcher-tracking one remove accidental coupling, and code that depended on the coupling breaks without an error. Nothing in the changelog is labelled breaking, so the safety net is your own tests, not the version number. If your suite lacks coverage around watchers nested in computed or render effects, add a test before upgrading rather than after.

Nothing here changes the 3.6 story. The [3.6 release candidates](/blog/2026-10-11-vue-3-6-rc-11-vapor-warnings) are still the place for Vapor work; 3.5.44 is for apps that stay on the stable renderer.

## Sources

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core CHANGELOG.md](https://github.com/vuejs/core/blob/main/CHANGELOG.md)
