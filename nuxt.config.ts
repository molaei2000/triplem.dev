// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    app: {
        head: {
            meta: [{ name: "apple-mobile-web-app-title", content: "TripleM" }],
            link: [
                { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
            ],
        },
    },
    modules: ["@nuxt/eslint", "@nuxt/image", "@nuxt/ui"],
    css: ["~/assets/css/main.css"],
});
