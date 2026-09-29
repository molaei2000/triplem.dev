# triplem.dev

Personal website of **Mohammad Mahdi Molaei**, a senior front-end engineer. Bilingual (English at `/`, Persian/RTL at `/fa`), with an interactive 3D hero, an experience timeline and a Markdown blog.

Built with [Nuxt 4](https://nuxt.com), [Nuxt Content](https://content.nuxt.com), [Tailwind CSS v4](https://tailwindcss.com), [shadcn-vue](https://shadcn-vue.com), [TresJS](https://tresjs.org) and [motion-v](https://motion.dev/docs/vue).

## Getting started

Requirements: Node `^22.21.1` and pnpm (version pinned in `package.json` → `packageManager`).

```bash
pnpm install    # also runs `nuxt prepare` (types + ESLint config)
pnpm dev        # http://localhost:3000
```

| Script           | What it does                          |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | Dev server with HMR (drafts visible)  |
| `pnpm build`     | Production server build (`.output/`)  |
| `pnpm generate`  | Static site (`.output/public/`)       |
| `pnpm preview`   | Serve the production build locally    |
| `pnpm lint`      | ESLint                                |
| `pnpm typecheck` | `vue-tsc` via `nuxt typecheck`        |

## Project structure

```
app/
├─ app.meta.ts            # site/author info + social links — the single source for SEO values
├─ app.config.ts          # runtime app config (Nuxt Icon)
├─ assets/
│  ├─ css/main.css        # design tokens (light :root, .dark), fonts, prose styles
│  └─ icons/              # every SVG icon, served by Nuxt Icon as `tm:<file-name>`
├─ components/
│  ├─ ui/                 # shadcn-vue components (generated, brand-tuned variants) → <UiButton> …
│  ├─ site/               # shell & shared building blocks: nav, footer, SiteSection, SiteMark, SiteArrow …
│  ├─ home/               # homepage sections (Hero, About, Stack, Experience, Blog, Contact)
│  ├─ hero/ stack/ experience/ blog/   # pieces used by those sections and the blog pages
│  ├─ art/                # decorative, data-shaped illustrations that can't be icons
│  └─ content/            # Nuxt Content prose overrides (ProsePre)
├─ composables/           # useTheme, useBlog*, useCopy, useJsonLd, useNavLinks, useArticleScroll
├─ data/                  # untranslatable structured data (experience, stack graph)
├─ pages/                 # index, blog/index, blog/[slug]
└─ lib/                   # cn(), 3D input bag
content/{en,fa}/blog/     # posts, one collection per locale
i18n/locales/{en,fa}.json # all UI copy
public/                   # fonts, images, 3D model
```

## Working on the site

### Copy and translations

All visible text lives in `i18n/locales/en.json` and `fa.json`. Always change both. Use logical Tailwind utilities (`ms-*`, `start-*`, `text-end`) so layouts flip in RTL.

### Writing a post

Add `content/en/blog/<slug>.md` (and the Persian version in `content/fa/blog/<slug>.md`):

```md
---
title: Post title
description: One-sentence summary used on cards and in meta tags.
date: 2026-09-12
tags: [Architecture, React]
draft: true   # visible in `pnpm dev` only
---
```

Reading time is calculated at build time.

### Icons

Drop an SVG into `app/assets/icons/` and use it with `<Icon name="tm:<file-name>" />`. Monochrome icons should draw with `currentColor` and set `fill`/`stroke` on each element, not on the root `<svg>`. Icons are bundled into the client, so nothing is fetched at runtime. Multi-colour SVGs (like `mark.svg`) need `mode="svg"`. For the logo, use `<SiteMark>`.

### UI components

Add shadcn-vue components with:

```bash
pnpm dlx shadcn-vue@latest add <component>
```

Components are generated into `app/components/ui/` with RTL-safe classes (`"rtl": true` in `components.json`). Their `cva` variants are tuned to the brand tokens (e.g. `Button` has `ink`, `outline`, `quiet`, `link` variants and a `label` size, `Toggle` has `node`/`chip`), so prefer a variant over ad-hoc classes.

### Theme

Dark is the default. The choice is stored in the `tm-theme` cookie so the server renders the right theme without a flash. Use the brand colour roles (`bg-surface`, `text-subtle`, `border-hairline`, `text-gold` …) rather than raw colours.
