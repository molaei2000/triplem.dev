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
                { name: "theme-color", content: "#0B0B0A", media: "(prefers-color-scheme: dark)" },
                { name: "theme-color", content: "#F3EFE7", media: "(prefers-color-scheme: light)" },
            ],
            link: [
                // above-the-fold faces; the rest load on demand (font-display: swap)
                { rel: "preload", as: "font", type: "font/woff2", crossorigin: "", href: "/fonts/FamiljenGrotesk/familjen-grotesk-latin-600-normal.woff2" },
                { rel: "preload", as: "font", type: "font/woff2", crossorigin: "", href: "/fonts/InstrumentSans/instrument-sans-latin-400-normal.woff2" },
            ],
        },
    },

    fonts: {
        provider: "local",
    },

    i18n: {
        baseUrl: "https://triplem.dev",
        defaultLocale: "en",
        strategy: "prefix_except_default",
        detectBrowserLanguage: false,
        locales: [
            { code: "en", language: "en-US", name: "English", file: "en.json", dir: "ltr" },
            { code: "fa", language: "fa-IR", name: "فارسی", file: "fa.json", dir: "rtl" },
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
