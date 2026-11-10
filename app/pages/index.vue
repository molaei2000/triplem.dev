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
        <!-- Lazy keeps three.js out of the route chunk, so a prefetched link to this page stays
             small. Rendered on the server, so its chunk is still preloaded here. -->
        <LazyHomeHero />
        <HomeAbout />
        <HomeStack />
        <HomeAi />
        <HomeExperience />
        <HomeBlog />
        <HomeContact />
    </div>
</template>
