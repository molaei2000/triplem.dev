<script setup lang="ts">
import meta, { socialLinks } from "~/app.meta";

useSeoMeta({
    description: meta.description,
    ogTitle: `${meta.author.name} — ${meta.author.jobTitle}`,
    ogDescription: meta.description,
    ogType: "website",
});

useJsonLd({
    "@type": "Person",
    name: meta.author.name,
    jobTitle: meta.author.jobTitle,
    url: meta.siteUrl,
    email: `mailto:${meta.contactEmail}`,
    sameAs: socialLinks.map((l) => l.href),
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
