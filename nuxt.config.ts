// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import { definePerson } from "nuxt-schema-org/schema";
import meta, { socialLinks } from "./app/app.meta";

export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    css: ["~/assets/css/main.css"],
    vite: {
        plugins: [tailwindcss()],
    },

    modules: [
        // Before @nuxt/content: the sitemap hooks into content parsing.
        "@nuxtjs/seo",
        "@nuxt/content",
        "@nuxt/eslint",
        "@nuxt/fonts",
        "@nuxt/hints",
        "@nuxt/icon",
        "@nuxt/image",
        "@nuxtjs/i18n",
        "@vueuse/nuxt",
        "shadcn-nuxt",
        "@tresjs/nuxt",
    ],

    app: {
        head: {
            meta: [
                {
                    name: "theme-color",
                    content: "#0B0B0A",
                    media: "(prefers-color-scheme: dark)",
                },
                {
                    name: "theme-color",
                    content: "#F3EFE7",
                    media: "(prefers-color-scheme: light)",
                },
            ],
            // Icons come from public/favicon.* (nuxt-seo-utils reads type and size from the files);
            // above-the-fold fonts are preloaded per locale in app.vue.
        },
    },

    fonts: {
        provider: "local",
    },

    image: {
        // IPX answers with max-age=60 by default; a week lets browsers keep resized images.
        ipx: { fs: { maxAge: 60 * 60 * 24 * 7 } },
    },

    nitro: {
        // Pre-compress build assets and public files (gzip + brotli). Nitro serves the encoded
        // copy when the browser accepts it, whatever the proxy in front compresses.
        compressPublicAssets: true,
    },

    routeRules: {
        // Unhashed public files (/_nuxt is already immutable). Fonts never change in place;
        // covers, photos and the model can be rebuilt under the same name.
        "/fonts/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
        "/images/**": {
            headers: { "cache-control": "public, max-age=86400, stale-while-revalidate=604800" },
        },
        "/models/**": {
            headers: { "cache-control": "public, max-age=86400, stale-while-revalidate=604800" },
        },
    },

    // Nuxt SEO. `site` feeds every module; app/app.meta.ts stays the single source.
    site: {
        url: meta.siteUrl,
        name: meta.name,
        description: meta.description,
        defaultLocale: "en",
    },
    seo: {
        // Same whitelist as useLocaleHead in app.vue: each /blog?page=N is its own page.
        canonicalQueryWhitelist: ["page"],
        // Every page sets its title and app.vue names the home page; the fallback would
        // title /fa "Fa" from its path.
        fallbackTitle: false,
    },
    linkChecker: {
        // The build prerenders no HTML, so there is nothing to scan; it still runs in dev.
        runOnBuild: false,
    },
    robots: {
        credits: false,
        // No client-side bot fingerprinting; robots.txt, the meta tag and the header are enough.
        botDetection: false,
    },
    sitemap: {
        credits: false,
    },
    schemaOrg: {
        identity: definePerson({
            name: meta.author.name,
            description: meta.author.description,
            jobTitle: meta.author.jobTitle,
            url: meta.siteUrl,
            image: "/images/about/portrait.webp",
            email: meta.contactEmail,
            knowsLanguage: ["en", "fa"],
            sameAs: socialLinks.map((l) => l.href),
        }),
    },
    // Social images are static files: public/og-image.png (scripts/og-default.mjs) and one PNG
    // per post (scripts/blog-cover.mjs). Nothing renders images at run time.
    ogImage: false,
    // Bundled with @nuxtjs/seo but not used here.
    aiReady: false,
    skewProtection: false,

    // Server-only secrets for the contact form; set via NUXT_SMTP_* / NUXT_CONTACT_TO (see .env.example).
    runtimeConfig: {
        smtp: {
            host: "smtp.gmail.com",
            port: 465,
            user: "",
            pass: "",
        },
        contact: {
            to: "",
        },
    },

    router: {
        options: {
            scrollBehaviorType: "smooth",
        },
    },

    icon: {
        // Every icon is a local SVG in app/assets/icons (`tm:<file>`), bundled into
        // the client so a static build never has to fetch one at runtime.
        customCollections: [{ prefix: "tm", dir: "./app/assets/icons" }],
        provider: "none",
        clientBundle: {
            scan: true,
            includeCustomCollections: true,
        },
    },

    content: {
        build: {
            markdown: {
                toc: { depth: 3, searchDepth: 3 },
                highlight: {
                    // code blocks stay dark in both themes (see ProsePre)
                    theme: "vitesse-dark",
                    langs: ["ts", "tsx", "js", "vue", "html", "css", "json", "bash", "md"],
                },
            },
        },
    },

    hooks: {
        // Reading time for blog posts (~200 wpm; fenced code counts as a third).
        "content:file:afterParse"({ file, content, collection }) {
            if (!collection.name.startsWith("blog_") || typeof file.body !== "string") return;
            const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
            const code = [...file.body.matchAll(/```[\s\S]*?```/g)].map((m) => m[0]).join(" ");
            const prose = file.body.replace(/```[\s\S]*?```/g, " ");
            content.minutes = Math.max(1, Math.round((count(prose) + count(code) / 3) / 200));
        },
    },

    i18n: {
        baseUrl: meta.siteUrl,
        defaultLocale: "en",
        strategy: "prefix_except_default",
        detectBrowserLanguage: false,
        locales: [
            {
                code: "en",
                language: "en-US",
                name: "English",
                file: "en.json",
                dir: "ltr",
            },
            {
                code: "fa",
                language: "fa-IR",
                name: "فارسی",
                file: "fa.json",
                dir: "rtl",
            },
        ],
    },

    shadcn: {
        /**
         * Prefix for all the imported component.
         * @default "Ui"
         */
        prefix: "Ui",
        /**
         * Directory that the component lives in.
         * Will respect the Nuxt aliases.
         * @link https://nuxt.com/docs/api/nuxt-config#alias
         * @default "@/components/ui"
         */
        componentDir: "@/components/ui",
    },
});
