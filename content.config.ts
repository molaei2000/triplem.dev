import { defineCollection, defineContentConfig } from "@nuxt/content";
import { z } from "zod";

/**
 * One blog collection per locale. Paths mirror the i18n routes
 * (`prefix_except_default`): content/en/blog/x.md → /blog/x,
 * content/fa/blog/x.md → /fa/blog/x — so a page can query by `route.path`.
 */
const post = z.object({
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
});

export default defineContentConfig({
    collections: {
        blog_en: defineCollection({
            type: "page",
            source: { include: "en/blog/**/*.md", prefix: "/blog" },
            schema: post,
        }),
        blog_fa: defineCollection({
            type: "page",
            source: { include: "fa/blog/**/*.md", prefix: "/fa/blog" },
            schema: post,
        }),
    },
});
