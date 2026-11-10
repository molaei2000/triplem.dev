import { defineCollection, defineContentConfig } from "@nuxt/content";
import { defineSitemapSchema } from "@nuxtjs/seo/content";
import { z } from "zod";

/**
 * One blog collection per locale. Paths mirror the i18n routes
 * (`prefix_except_default`): content/en/blog/x.md → /blog/x,
 * content/fa/blog/x.md → /fa/blog/x — so a page can query by `route.path`.
 */
const post = (name: "blog_en" | "blog_fa") =>
    z.object({
        date: z.date(),
        tags: z.array(z.string()).default([]),
        /** Drafts render in `nuxt dev` only. */
        draft: z.boolean().default(false),
        /** Filled at build time by the `content:file:afterParse` hook in nuxt.config. */
        minutes: z.number().optional(),
        /**
         * Cover art: `/images/blog/<slug>.svg`, drawn in the dark palette. The light twin and the
         * Open Graph PNG sit next to it (`scripts/blog-cover.mjs`, rules in .github/blog-cover.md).
         */
        cover: z.string().optional(),
        /**
         * Sitemap entry, filled by @nuxtjs/sitemap from `path` and `date`. The filter is copied
         * into the server bundle as source, so it can only use its own argument.
         */
        sitemap: defineSitemapSchema({ name, filter: (entry) => !entry.draft }),
    });

export default defineContentConfig({
    collections: {
        blog_en: defineCollection({
            type: "page",
            source: { include: "en/blog/**/*.md", prefix: "/blog" },
            schema: post("blog_en"),
        }),
        blog_fa: defineCollection({
            type: "page",
            source: { include: "fa/blog/**/*.md", prefix: "/fa/blog" },
            schema: post("blog_fa"),
        }),
    },
});
