<script setup lang="ts">
import { MotionConfig } from "motion-v";
import meta from "~/app.meta";

const { t, locale } = useI18n();
const { isDark } = useTheme();
// `page` stays in canonical/alternate links so each /blog?page=N is indexed as its own page.
const i18nHead = useLocaleHead({ seo: { canonicalQueries: ["page"] } });

// Above-the-fold faces for the current script; the rest load on demand (font-display: swap).
const FONT_PRELOADS = {
    en: [
        "/fonts/FamiljenGrotesk/familjen-grotesk-latin-600-normal.woff2",
        "/fonts/InstrumentSans/instrument-sans-latin-400-normal.woff2",
    ],
    fa: ["/fonts/Kalameh/KALAMEH-BOLD%20.TTF", "/fonts/IranSans/IRANSANS_FANUM_MEDIUM.TTF"],
};
const fontPreloads = computed(() =>
    FONT_PRELOADS[locale.value === "fa" ? "fa" : "en"].map((href) => ({
        rel: "preload" as const,
        as: "font" as const,
        type: href.endsWith(".woff2") ? "font/woff2" : "font/ttf",
        crossorigin: "" as const,
        href,
    })),
);

useHead(() => ({
    htmlAttrs: {
        ...i18nHead.value.htmlAttrs,
        class: isDark.value ? "dark" : "",
    },
    link: [...fontPreloads.value, ...(i18nHead.value.link ?? [])],
    meta: [...(i18nHead.value.meta ?? [])],
    titleTemplate: (title?: string) =>
        title ? `${title} — ${meta.name}` : `${t("hero.name")} — ${t("footer.role")}`,
}));

// Default description per locale; og:site_name, og:url and the canonical come from Nuxt SEO.
useSeoMeta({
    description: () => t("nuxtSiteConfig.description"),
    author: meta.author.name,
});
</script>

<template>
    <MotionConfig reduced-motion="user">
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </MotionConfig>
</template>
