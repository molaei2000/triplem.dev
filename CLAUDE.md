# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal website for Mohammad Mahdi Molaei (triplem.dev), built on Nuxt 4. Bilingual (English default, Persian/RTL under `/fa`): a single-page homepage made of section components, a 3D hero, an experience timeline, and a Markdown blog.

## Commands

Package manager is **pnpm** (see `packageManager` in `package.json`); Node `^22.21.1`.

```bash
pnpm install        # also runs `nuxt prepare` (generates .nuxt/ types and eslint config)
pnpm dev            # dev server on http://localhost:3000
pnpm build          # production build
pnpm generate       # static generation
pnpm preview        # preview production build
pnpm lint           # eslint (cached)
pnpm typecheck      # nuxt typecheck (vue-tsc)
```

There is no test runner configured. `tsconfig.json` and `eslint.config.mjs` depend on files generated into `.nuxt/`, so run `pnpm install` or `nuxt prepare` first in a fresh checkout. ESLint ignores `.agents/` and `.claude/` (vendored skills).

Code style: 4-space indent, double quotes, semicolons.

## Architecture

- **Nuxt 4 layout**: source lives under `app/` (`~`/`@` resolves to `app/`). `app/app.vue` wraps everything in motion-v `<MotionConfig reduced-motion="user">`, sets the `html.dark` class, i18n SEO head, and the title template. `app/layouts/default.vue` renders the nav, footer, and the fixed `tech-grid`/`grain` backdrops.
- **Site metadata**: `app/app.meta.ts` is the single source for site/author info, social links, and URLs. Use it for SEO/meta values instead of hardcoding.
- **i18n**: `@nuxtjs/i18n` with `en` (default, no prefix) and `fa` (`/fa`, `dir: rtl`), strategy `prefix_except_default`, browser detection off. All user-visible copy lives in `i18n/locales/{en,fa}.json`, keyed by homepage section (`hero`, `about`, `experience`, `blog`, ...). Every copy change has to land in both files. Use logical properties (`start`/`end`, `ms`/`me`) so layouts flip correctly in RTL.
- **Experience timeline**: `app/data/experience.ts` (and `app/data/stack.ts` for the Stack graph) holds only the untranslatable structure (id, host, link, stack, screenshots in `public/images/work/`). Prose lives in i18n under `experience.items.<id>`: `highlights.N` is indexed by the entry's `highlights` count and `alt.N` by its `shots`. Adding an entry means updating the data file and both locale files together.
- **Blog (Nuxt Content v3)**: `content.config.ts` defines one collection per locale (`blog_en`, `blog_fa`) whose path prefixes mirror the i18n routes (`content/en/blog/x.md` → `/blog/x`, `content/fa/blog/x.md` → `/fa/blog/x`). That lets pages query by `route.path` directly. Frontmatter: `title`, `description`, `date`, `tags`, `draft`. `minutes` (reading time) is computed by the `content:file:afterParse` hook in `nuxt.config.ts`. Drafts show only in `nuxt dev` (`showDrafts` in `app/composables/useBlog.ts`); every query has to respect it. `useBlog.ts` also provides locale-aware date/number formatting (Persian calendar and digits on `/fa`). Code blocks use the `vitesse-dark` Shiki theme and render through `app/components/content/ProsePre.vue`, which stays dark in both themes. Content uses SQLite (`better-sqlite3`, local DB in `.data/`).
- **Theme**: `useTheme()` (`app/composables/useTheme.ts`) stores the theme in the `tm-theme` cookie so SSR renders the correct `html.dark` class with no flash. Dark is the default. The toggle, `<html>`, and the 3D scene all read the shared `useState`.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` (no `tailwind.config`). All tokens live in `app/assets/css/main.css`: `:root` is the light ("editorial ivory") palette, `.dark` overrides it, and `@custom-variant dark` targets a `.dark` ancestor. For page design, use the brand color roles (`surface`, `elevated`, `subtle`, `faint`, `hairline`, `gold`, `on-gold`, `glass`, ...) rather than the shadcn roles. Fonts are self-hosted `@font-face` declarations in `main.css` (files in `public/fonts/`, `@nuxt/fonts` uses the `local` provider). Latin: Familjen Grotesk (headline), Instrument Sans (body), IBM Plex Mono (code/labels). `[dir="rtl"]` swaps to Kalameh/IRANSans and drops letter-spacing. Above-the-fold fonts are preloaded in `nuxt.config.ts`.
- **3D hero**: TresJS (`@tresjs/nuxt`, three.js). `HeroStage.client.vue` (client-only) owns the canvas, pointer input, off-screen pausing, and a WebGL-unavailable fallback. `HeroSlashScene.vue` loads `public/models/triplem-slash.glb` and does all per-frame work in the render loop. The two communicate through a plain mutable object from `app/lib/slash-input.ts`, which is kept non-reactive on purpose so the hot path never triggers Vue updates. The scene is `aria-hidden`; `HomeHero` carries the accessible content.
- **Animation**: `motion-v`. `SiteReveal` is the standard once-only scroll reveal. Reduced motion is honoured globally via `MotionConfig` and in the hero via `usePreferredReducedMotion`.
- **Components**: auto-imported with path prefixes (`components/home/HomeHero.vue` → `<HomeHero>`, `components/site/*` → `<Site*>`). Pages and `Home*` sections are composition surfaces; feature pieces live in `components/{hero,stack,experience,blog}/`. Shared building blocks are in `components/site/`: `SiteSection` (anchor + header + `titleId` slot prop), `SiteMark` (logo, `accent`/`tone` props), `SiteArrow` (RTL-aware arrow), `SiteCopyButton`, and `SiteOutlineTitle`. Social links come from `socialLinks` in `app.meta.ts`. External links use `<NuxtLink target="_blank">`, which adds `rel` automatically.
- **shadcn-vue**: components are in `app/components/ui/` (`Ui` prefix: `<UiButton>`, `<UiBadge>`, `<UiToggle>`, `<UiToggleGroup>`, `<UiInputGroup>`, `<UiSeparator>`). `components.json` has `"rtl": true`, so generated classes are logical. Their `cva` variants are edited to match the brand: Button `ink`/`outline`/`ghost`/`quiet`/`link` with sizes `label` (eyebrow type)/`inline`/`icon`, Toggle `outline`/`node`/`chip`, and Badge `outline`/`mono`/`gold`. Prefer a variant over restyling with `class`. Use `cn()` from `app/lib/utils.ts` for class merging. ESLint turns off `vue/require-default-prop` for `ui/` so generated files stay close to upstream. The shadcn CLI installs dependencies through `corepack pnpm`, which fails with this project's pnpm 12. If `add` fails at "Installing dependencies", put a temporary `node_modules/.bin/corepack.cmd` shim that forwards to `pnpm` and remove it afterwards.
- **Icons**: `@nuxt/icon` with a local custom collection. Every icon is an SVG in `app/assets/icons/`, used as `<Icon name="tm:<file>" />`. Icons are bundled into the client (`provider: "none"`), and `app/app.config.ts` sets `cssLayer: "base"` so Tailwind can size them. Monochrome icons render in CSS mask mode, so set `fill`/`stroke="currentColor"` on each element. The multi-colour logo (`mark.svg`) reads `--mark-*` CSS variables and must use `mode="svg"` (`SiteMark` does this). Decorative illustrations that need root SVG attributes or data-driven geometry stay as components (`components/art/`, `StackGraph`).
- **SSR width**: `app/plugins/ssr-width.ts` calls `provideSSRWidth(1024)` so VueUse breakpoint/media-query composables render consistently on the server.
- **Other modules**: `@nuxt/image`, `@nuxt/hints`, `@vueuse/nuxt`, `@nuxt/eslint`.

## Agent skills

Project-local skills are installed under `.claude/skills/` and `.agents/skills/` (tracked in `skills-lock.json`), covering Nuxt, Nuxt Content, i18n, Vue, reka-ui, shadcn-vue, motion/animation design, etc. Prefer invoking the relevant skill when working in those areas.
