// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    css: ["~/assets/css/main.css"],
    vite: {
        plugins: [tailwindcss()],
    },

    modules: [
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
            link: [
                { rel: "icon", type: "image/x-icon", href: "/favicon.png" },
                // above-the-fold faces; the rest load on demand (font-display: swap)
                {
                    rel: "preload",
                    as: "font",
                    type: "font/woff2",
                    crossorigin: "",
                    href: "/fonts/FamiljenGrotesk/familjen-grotesk-latin-600-normal.woff2",
                },
                {
                    rel: "preload",
                    as: "font",
                    type: "font/woff2",
                    crossorigin: "",
                    href: "/fonts/InstrumentSans/instrument-sans-latin-400-normal.woff2",
                },
            ],
        },
    },

    fonts: {
        provider: "local",
    },

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
                    langs: [
                        "ts",
                        "tsx",
                        "js",
                        "vue",
                        "html",
                        "css",
                        "json",
                        "bash",
                        "md",
                    ],
                },
            },
        },
    },

    hooks: {
        // Reading time for blog posts (~200 wpm; fenced code counts as a third).
        "content:file:afterParse"({ file, content, collection }) {
            if (
                !collection.name.startsWith("blog_") ||
                typeof file.body !== "string"
            )
                return;
            const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
            const code = [...file.body.matchAll(/```[\s\S]*?```/g)]
                .map((m) => m[0])
                .join(" ");
            const prose = file.body.replace(/```[\s\S]*?```/g, " ");
            content.minutes = Math.max(
                1,
                Math.round((count(prose) + count(code) / 3) / 200),
            );
        },
    },

    i18n: {
        baseUrl: "https://triplem.dev",
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
