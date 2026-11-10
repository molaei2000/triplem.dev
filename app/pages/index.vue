<script setup lang="ts">
const { t } = useI18n();

// The Person, WebSite and WebPage JSON-LD nodes are site-wide (schemaOrg in nuxt.config.ts).
useSeoMeta({
    ogTitle: () => `${t("hero.name")} — ${t("footer.role")}`,
    ogDescription: () => t("nuxtSiteConfig.description"),
    ogType: "website",
});
</script>

<template>
    <div>
        <HomeHero />
        <HomeAbout />
        <HomeStack />
        <HomeAi />
        <HomeExperience />
        <HomeBlog />
        <HomeContact />
    </div>
</template>
