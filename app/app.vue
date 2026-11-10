<script setup lang="ts">
import { MotionConfig } from "motion-v";
import meta from "~/app.meta";

const { t } = useI18n();
const { isDark } = useTheme();
// `page` stays in canonical/alternate links so each /blog?page=N is indexed as its own page.
const i18nHead = useLocaleHead({ seo: { canonicalQueries: ["page"] } });

useHead(() => ({
    htmlAttrs: {
        ...i18nHead.value.htmlAttrs,
        class: isDark.value ? "dark" : "",
    },
    link: [...(i18nHead.value.link ?? [])],
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
