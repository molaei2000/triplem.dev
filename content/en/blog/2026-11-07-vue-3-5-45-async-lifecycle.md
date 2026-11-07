---
title: "Vue 3.5.45: 31 fixes, and most of them are about components that die while still loading"
description: "Vue 3.5.45 (5 November) fixes Suspense, KeepAlive, async setup and onScopeDispose edge cases. What changed for unmounting mid-await, and what to test before upgrading."
date: 2026-11-07
cover: /images/blog/2026-11-07-vue-3-5-45-async-lifecycle.svg
tags: [vue, reactivity]
draft: false
---

Vue 3.5.45 was [published on 5 November](https://github.com/vuejs/core/releases) and is marked as the latest stable release. The [changelog](https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md) lists 31 bug fixes and four performance items. The release page itself has no prose, so the changelog is the only description. Most of the fixes share one theme: what happens when a component is unmounted, replaced or rejected while its async work is still in flight. That is a pattern worth understanding rather than a list of unrelated patches.

This is the follow-up to [3.5.44](/blog/2026-10-15-vue-3-5-44-reactivity-fixes), which already had a Suspense cluster. The 3.6 line is still in release-candidate mode (rc.14 on 30 October), so production fixes keep landing on 3.5.

## The headline fix: `onScopeDispose` in a stopped scope

The most consequential entry is `reactivity: onScopeDispose runs in a stopped scope` ([#16108](https://github.com/vuejs/core/pull/16108)). The PR describes the failure like this: a `<script setup>` component with a top-level `await` is unmounted under `<Suspense>` while the promise is pending. Its effect scope is stopped at that moment. When the await resolves, `withAsyncContext` restores that stopped scope as the active one. Any `onScopeDispose` call after that point pushed its callback into a cleanup list that had already been emptied, so it never ran.

The practical consequence is a leak. A composable that registers a listener and relies on `onScopeDispose` to remove it would attach the listener once and never detach it:

```vue
<script setup lang="ts">
// Navigate away while this await is pending.
const config = await fetchConfig();

// Before 3.5.45 the cleanup was queued into a dead scope.
// useEventListener registers its removal through onScopeDispose.
useEventListener(window, "resize", onResize);
</script>
```

After the fix, `onScopeDispose` checks whether the active scope is still active, and if it has stopped, it runs the callback immediately. The listener is attached and removed in the same tick instead of living forever. The PR says this mirrors an existing guard in the `ReactiveEffect` and `EffectScope` constructors from [#14778](https://github.com/vuejs/core/pull/14778), and that behaviour is unchanged when there is no active scope or the scope is still running.

Two things to note. First, the changelog entry reads as a general `onScopeDispose` change, not a Suspense one, so the same rule now applies to any code that re-enters a stopped scope. Second, the callback now runs synchronously at registration, so cleanup code that assumes it runs only at teardown time must tolerate being called early.

## Rejected async setup now renders nothing

`runtime-core: a component whose async setup rejects renders nothing` ([#16111](https://github.com/vuejs/core/pull/16111)). Per the PR summary, a component whose async `setup` fails now renders an empty placeholder (a comment node in the tests). It no longer falls back to its template or triggers extra render errors. In SSR and hydration the failed component keeps the expected placeholder markup, and the error handler receives the setup error once.

A related entry says the boundary resolves when an async setup rejects without an error handler in dev ([#16110](https://github.com/vuejs/core/pull/16110)), so a failing child should stop leaving a Suspense boundary pending in development.

For Nuxt apps this matters most with error handling in place. If you wrap widgets in `NuxtErrorBoundary` or set `app.config.errorHandler`, expect one clean error and an empty slot rather than a cascade. If you relied on the old fallback rendering, add an explicit error UI.

## Suspense: a long tail of "unmounted while pending"

Of the 31 fixes, 13 are scoped `suspense`, and most describe state that survived when it should not have. Grouped by what they protect:

- **Unmount while pending:** the fallback is not mounted after the boundary is unmounted ([#15939](https://github.com/vuejs/core/pull/15939)), unmount hooks of a pending branch are dropped, the placeholder of an unmounted pending async component is removed ([#15982](https://github.com/vuejs/core/pull/15982)), and the parent dependency is released on suspensible unmount ([#15870](https://github.com/vuejs/core/pull/15870)).
- **Discarded branches:** a discarded component stays marked as unmounted, its internal cleanup is kept, async dependencies of a discarded pending cycle are resolved ([#15980](https://github.com/vuejs/core/pull/15980)), and the root update retry survives a discarded branch ([#16107](https://github.com/vuejs/core/pull/16107)).
- **Timing:** the timeout keeps counting when the root is switched again while pending ([#16143](https://github.com/vuejs/core/pull/16143)).
- **Nested boundaries:** same-root updates are patched in retained content ([#16109](https://github.com/vuejs/core/pull/16109)), and a root replacement is skipped in a retained nested boundary that is showing its fallback ([#16125](https://github.com/vuejs/core/pull/16125)).
- **Transitions:** transitions nested in the pending branch are entered on reveal ([#16121](https://github.com/vuejs/core/pull/16121)), modes are switched around a keyed suspense boundary ([#16124](https://github.com/vuejs/core/pull/16124)), the out-in `afterLeave` of an unmounted boundary is skipped ([#16115](https://github.com/vuejs/core/pull/16115)), and an immediately completed leave is handled in out-in mode ([#11824](https://github.com/vuejs/core/pull/11824)).

The changelog gives titles only, so I can't say how many of these you can hit in a normal app. They cluster around rapid navigation, nested async boundaries and out-in transitions on async pages, which is the Nuxt page-transition-plus-async-setup combination.

## KeepAlive, hydration and the rest

- KeepAlive: a resolved Suspense child is cached immediately ([#16119](https://github.com/vuejs/core/pull/16119)), and a child deactivated before it was cached is unmounted ([#15981](https://github.com/vuejs/core/pull/15981)).
- Hydration: a component's `el` is updated only when its host node is replaced ([#16001](https://github.com/vuejs/core/pull/16001)).
- HMR: reloads are retried after pending async roots resolve ([#16060](https://github.com/vuejs/core/pull/16060)).
- Runtime-core: directive `mounted` hooks receive the latest binding ([#16120](https://github.com/vuejs/core/pull/16120)), and stopped error boundaries are skipped for async failures ([#16061](https://github.com/vuejs/core/pull/16061)).
- Compiler: `catch` and `switch` scopes are respected in `compiler-sfc` ([#16101](https://github.com/vuejs/core/pull/16101)), and static boolean bindings keep their semantics in `compiler-dom` ([#16055](https://github.com/vuejs/core/pull/16055)).
- Runtime-dom: `disablepictureinpicture` and `disableremoteplayback` are boolean attributes ([#15952](https://github.com/vuejs/core/pull/15952)).
- `v-model`: the `number` modifier is respected for `Set` select values.

## Performance items

Four entries are tagged as performance: `compiler-ssr` renders static `style` attributes at compile time ([#16010](https://github.com/vuejs/core/pull/16010)), `compiler-sfc` skips unused tsconfig include enumeration ([#15899](https://github.com/vuejs/core/pull/15899)), internal initialisers are marked pure ([#16012](https://github.com/vuejs/core/pull/16012)), and raw attrs are copied when setup context attrs are passed as vnode props ([#16129](https://github.com/vuejs/core/pull/16129)). The changelog provides no measurements, so treat them as direction, not numbers. The SSR one is the easiest to verify yourself by diffing server output.

## Upgrade checklist

Nothing is labelled breaking, but several entries change observable behaviour in edge cases:

1. Search your composables for `onScopeDispose` and check whether any assumes it never runs at registration.
2. Test navigation away from pages with top-level `await` while the request is slow, and confirm that listeners, timers and observers are released.
3. If you handle async setup errors, check the UI for a failed child: it is now an empty placeholder, not a partially rendered template.
4. Run your page-transition flows with `mode="out-in"` and async pages.

## Trade-offs

These fixes make unmount semantics more predictable, but a change like running a cleanup immediately is still a behaviour change: code that quietly depended on never being cleaned up (a listener that happened to outlive its component) will now stop working, silently. The safety net is your own tests around unmount timing, not the version number. If you don't use Suspense, async setup or `KeepAlive` together, most of this release won't touch you, and a routine bump is enough.

## Sources

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core release v3.5.45](https://github.com/vuejs/core/releases/tag/v3.5.45)
- [vuejs/core CHANGELOG.md](https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md)
- [vuejs/core PR #16108](https://github.com/vuejs/core/pull/16108)
- [vuejs/core PR #16111](https://github.com/vuejs/core/pull/16111)
