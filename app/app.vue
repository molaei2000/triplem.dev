<script setup lang="ts">
import { MotionConfig } from "motion-v";
import meta from "~/app.meta";

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
        title ? `${title} — ${meta.name}` : `${meta.author.name} — ${meta.author.jobTitle}`,
}));

useSeoMeta({
    description: meta.description,
    ogSiteName: meta.name,
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
