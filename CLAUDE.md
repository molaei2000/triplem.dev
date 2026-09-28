# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal website for Mohammad Mahdi Molaei (triplem.dev), built on Nuxt 4. The project is at an early scaffold stage: `app/app.vue` is still a placeholder, and there are no pages, content collections, or i18n locales configured yet.

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

There is no test runner configured.

## Architecture

- **Nuxt 4 layout**: application source lives under `app/` (`~`/`@` alias resolves to `app/`). `tsconfig.json` and `eslint.config.mjs` both depend on files generated into `.nuxt/`, so run `pnpm install` or `nuxt prepare` before linting/typechecking in a fresh checkout.
- **Site metadata**: `app/app.meta.ts` holds site/author info (name, URLs, email). Use it as the single source for SEO/meta values rather than hardcoding.
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no `tailwind.config`). Theme tokens are CSS variables (oklch, shadcn "stone" base) defined in `app/assets/css/main.css`, with dark mode via a `.dark` ancestor class (`@custom-variant dark`). `tw-animate-css` is imported there too.
- **UI components**: shadcn-vue (`shadcn-nuxt` module, "new-york" style, lucide icons). Components are generated into `app/components/ui/` and auto-imported with the `Ui` prefix (e.g. `<UiButton>`). Use `cn()` from `app/lib/utils.ts` for class merging. `components.json` defines the shadcn CLI aliases.
- **Animation**: `motion-v` (Motion for Vue).
- **Fonts**: `@nuxt/fonts` uses the `local` provider, serving files from `public/fonts/` (Persian fonts IranSans and Kalameh, plus Gemsbuck). JetBrains Mono is loaded from Google Fonts in `main.css` and is the heading font.
- **SSR width**: `app/plugins/ssr-width.ts` calls `provideSSRWidth(1024)` so VueUse breakpoint/media-query composables render consistently on the server.
- **Other modules enabled**: `@nuxt/content` (v3, SQLite-backed; `.data/` holds its local DB), `@nuxtjs/i18n`, `@nuxt/icon`, `@nuxt/image`, `@nuxt/hints`, `@vueuse/nuxt`.

## Agent skills

Project-local skills are installed under `.claude/skills/` and `.agents/skills/` (tracked in `skills-lock.json`), covering Nuxt, Nuxt Content, i18n, Vue, reka-ui, motion/animation design, etc. Prefer invoking the relevant skill when working in those areas.
