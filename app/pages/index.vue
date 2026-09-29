<script setup lang="ts">
import meta from "~/app.meta";

useSeoMeta({
    description: meta.description,
    ogTitle: `${meta.author.name} — ${meta.author.jobTitle}`,
    ogDescription: meta.description,
    ogType: "website",
});

useSchemaOrgPerson();

function useSchemaOrgPerson() {
    useHead({
        script: [{
            type: "application/ld+json",
            innerHTML: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Person",
                "name": meta.author.name,
                "jobTitle": meta.author.jobTitle,
                "url": meta.siteUrl,
                "email": `mailto:${meta.contactEmail}`,
                "sameAs": [meta.social.github, meta.social.linkedin, meta.social.telegram],
            }),
        }],
    });
}
</script>

<template>
    <div>
        <HomeHero />
        <HomeAbout />
        <HomeStack />
        <HomeExperience />
        <HomeBlog />
        <HomeContact />
    </div>
</template>
