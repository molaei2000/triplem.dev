---
title: "Vue 3.6.0-rc.11: Vapor starts warning you about what it ignores"
description: "Vue 3.6.0-rc.11 shipped on Oct 10 with new Vapor warnings for v-memo and global properties, vdom/Vapor Transition interop, and dozens of parity fixes. What to check."
date: 2026-10-11
cover: /images/blog/2026-10-11-vue-3-6-rc-11-vapor-warnings.svg
tags: [vue, vapor]
draft: false
---

Vue [3.6.0-rc.11](https://github.com/vuejs/core/releases) was published on October 10, ten days after rc.10. It is a pre-release; the releases page still lists 3.5.43 as the latest stable version. The [3.6 changelog](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md) shows one feature, two performance entries and a long list of Vapor bug fixes. The interesting part isn't the volume. Several entries make Vapor tell you when it is silently doing something different from the vdom renderer.

## The one feature: Transition across the renderer boundary

The only entry under Features is #15758: Vapor slot content can now be transitioned inside a vdom `Transition`. This is interop work. In a mixed app, a vdom component wrapping a Vapor component's slot content in `<Transition>` is a natural thing to write when you convert leaves first, and until now it was an edge you had to avoid.

The fixes around it point the same way: an interop `v-show` now follows the element mount lifecycle (#15806), a vapor slot called directly by a render function renders as its outlet (#15743), and multi-root vdom slot content is kept forwarded below a Vapor transition root (#15754).

## Warnings for ignored behaviour

Three entries add dev-time warnings:

- `v-memo` is ignored in Vapor templates, and the compiler now warns about it (#15788).
- Accessing global properties from a Vapor template warns at runtime (#15789).
- `@vue:*` lifecycle hooks on elements are ignored, and that now warns too (#15807).

The [rc.10 post](/blog/2026-10-02-vue-3-6-rc-10-vapor-fixes) listed `v-memo` and `globalProperties` among unsupported features, based on a third-party guide. The changelog now confirms, at least for `v-memo`, that the compiler ignores it rather than failing. A template that compiled and ran before still does, only without the memoisation you were relying on. A warning is better than silence, but it is a dev-only signal, so run your test suite with warnings treated as errors before converting a component.

```vue
<script setup vapor lang="ts">
import { ref } from "vue";
const rows = ref<{ id: number; label: string }[]>([]);
</script>

<template>
    <!-- rc.11 warns that v-memo is ignored here -->
    <li v-for="row in rows" :key="row.id" v-memo="[row.label]">{{ row.label }}</li>
</template>
```

If a list depended on `v-memo` to avoid re-rendering large rows, measure it after conversion rather than assuming Vapor's fine-grained updates make up for it. I did not benchmark this, and the changelog says nothing about performance here.

## Stricter compile-time checks

Other compiler entries move errors earlier:

- Vapor scripts without `<script setup>` are rejected (#15790). A `vapor` attribute on a plain `<script>` is now a compile error rather than something that half-works.
- `v-model` on `const` bindings (#15779) and on `v-for` or `v-slot` scope variables (#15810) is reported.
- Setup component lookup order is aligned with vdom (#15786), and setup bindings can shadow known globals (no PR number is listed in the changelog).

The `v-model` reports matter most. Assigning to a `const` or to a loop variable is a bug in either renderer, but a compiler that emits direct DOM code has to decide what to generate for it. Reporting it is the safer choice.

## Parity fixes worth scanning

The bulk of the release follows the pattern from earlier RCs, so I'll group only the entries that touch common app code:

- **Forms:** `select` values sync after option updates (#15827), checkbox value changes are tracked in model effects (#15815), an input's value is set after its other props (#15722), and symbol input values are stringified like vdom (#15830).
- **Hydration:** forwarded slots below transition roots (#15812), empty `once` branch anchors (#15821), and app `mounted` hooks now run after hydration ends (#15753).
- **Async components:** changed inputs are forwarded to deferred async components (#15809).
- **Namespaces:** dynamic component roots for SVG and MathML are created in their own namespace (#15797).
- **HMR:** root chain state is re-applied after an HMR rerender (#15750).
- **Tooling:** asset URL imports are handled in component props and `v-bind` objects (#15799).

Anything in the forms and hydration groups is a place where, if you had a workaround for Vapor behaviour in an earlier RC, you should check whether it still applies. The list also contains no breaking-change section.

## Performance entries

There are two, both small. `compiler-sfc` now caches tsconfig glob matchers and keeps private fields native in the CJS build (#15784). `runtime-vapor` tree-shakes unused slot source caching (#15838). The second one reduces the Vapor runtime a little for apps that don't use that feature, but the changelog gives no size figure, so I won't quote one.

## What to do with it

- **Production apps:** stay on 3.5.x. The stable line is unchanged, and a release that is still fixing `select` syncing and `v-model` ordering is not one to ship on.
- **Teams trialling Vapor in a mixed app:** upgrade to rc.11 on a branch and watch the console. The three new warnings are a free audit of which templates rely on features Vapor skips.
- **Library authors:** run your components under both renderers. The interop fixes in this release suggest slots and `v-show` across the boundary are where bugs still surface.
- **Nuxt users:** I did not verify Nuxt's integration with Vapor, so treat it as untested here.

## Trade-offs

The Vapor model trades vdom-era APIs for less runtime work. A release that adds warnings for `v-memo`, global properties and `@vue:*` hooks is the project being honest about that trade. What rc.11 does not do is close the list. Every warning is a feature you had in vdom and don't have in Vapor, so converting a component is a decision you make per component with that list in hand.

## Sources

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core release v3.6.0-rc.11](https://github.com/vuejs/core/releases/tag/v3.6.0-rc.11)
- [vuejs/core CHANGELOG (minor branch)](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md)
