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
    ],
    fonts: {
        provider: "local",
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
