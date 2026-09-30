<script setup lang="ts">
import meta, { socialLinks } from "~/app.meta";

const { t, locale } = useI18n();
const localePath = useLocalePath();
const portrait = `${meta.siteUrl}/images/about/portrait.webp`;

useSeoMeta({
    title: () => t("aboutPage.metaTitle"),
    description: () => t("aboutPage.metaDescription"),
    ogTitle: () => `${t("hero.name")} — ${t("footer.role")}`,
    ogDescription: () => t("aboutPage.metaDescription"),
    ogType: "profile",
    ogImage: portrait,
});

useJsonLd(() => ({
    "@type": "ProfilePage",
    "url": `${meta.siteUrl}${localePath("/about")}`,
    "inLanguage": locale.value === "fa" ? "fa-IR" : "en-US",
    "mainEntity": {
        "@type": "Person",
        "name": meta.author.name,
        "jobTitle": meta.author.jobTitle,
        "url": meta.siteUrl,
        "image": portrait,
        "email": `mailto:${meta.contactEmail}`,
        "knowsLanguage": ["en", "fa"],
        "sameAs": socialLinks.map(l => l.href),
    },
}));

const facts = ["basedIn", "focus", "primary", "also", "languages"] as const;
</script>

<template>
    <div>
        <section class="shell pt-20 pb-20 md:pt-28 md:pb-40" aria-labelledby="about-page-title">
            <SiteSectionHeader :label="t('aboutPage.label')" :caption="t('aboutPage.caption')" coord="p · 03" />

            <div class="mt-10 grid-12 items-start gap-y-12 md:mt-8">
                <AboutPortrait class="col-span-4 md:col-span-5" />

                <div class="col-span-4 flex flex-col gap-8 md:col-span-6 md:col-start-7 md:pt-4">
                    <h1 id="about-page-title"
                        class="font-display text-[3.5rem] leading-[0.9] font-semibold tracking-[-0.045em] text-balance md:text-[4.5rem] md:leading-[0.88] xl:text-[6rem] md:tracking-[-0.05em] rtl:leading-[1.2]">
                        {{ t("hero.name") }}<span class="text-gold">.</span>
                    </h1>
                    <p class="font-display text-2xl leading-snug tracking-[-0.015em] md:text-[2rem]">
                        {{ t("aboutPage.role") }} {{ t("about.s1") }} <span class="text-subtle">{{ t("about.pixels")
                        }}</span> {{ t("about.s2") }}<span class="text-gold">.</span>
                    </p>
                    <div class="flex flex-col gap-5 text-[17px] leading-relaxed text-subtle md:text-[19px]">
                        <p><span class="text-foreground">{{ t("about.p1a") }}</span> {{ t("about.p1b") }}</p>
                        <p>{{ t("aboutPage.p2") }}</p>
                        <p>{{ t("aboutPage.p3") }}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-3">
                        <UiButton as-child variant="gold" size="lg">
                            <NuxtLinkLocale to="/contact">{{ t("aboutPage.cta") }}
                                <SiteArrow />
                            </NuxtLinkLocale>
                        </UiButton>
                        <UiButton v-if="meta.cv" as-child variant="outline" size="label" class="md:h-11">
                            <NuxtLink :to="meta.cv" target="_blank">{{ t("aboutPage.cv") }}
                                <Icon name="tm:arrow-down" />
                            </NuxtLink>
                        </UiButton>
                    </div>
                </div>
            </div>

            <AboutFacts :keys="facts" class="mt-16 md:mt-24 md:grid-cols-5" />
        </section>

        <SiteSection id="method" :label="t('aboutPage.methodLabel')" :caption="t('aboutPage.methodCaption')"
            coord="///">
            <template #default="{ titleId }">
                <h2 :id="titleId" class="sr-only">{{ t("aboutPage.methodCaption") }}</h2>
                <AboutMethod class="mt-10 md:mt-14" />
            </template>
        </SiteSection>

        <SiteSection id="toolbox" :label="t('aboutPage.toolboxLabel')" :caption="t('aboutPage.toolboxCaption')"
            coord="lang · fw · craft">
            <template #default="{ titleId }">
                <h2 :id="titleId" class="sr-only">{{ t("aboutPage.toolboxCaption") }}</h2>
                <AboutToolbox class="mt-10 md:mt-14" />
            </template>
        </SiteSection>

        <SiteSection id="path" :label="t('aboutPage.pathLabel')" :caption="t('aboutPage.pathCaption')"
            coord="from 2020 to now">
            <template #default="{ titleId }">
                <h2 :id="titleId" class="sr-only">{{ t("aboutPage.pathCaption") }}</h2>
                <AboutPath class="mt-4 md:mt-8" />
            </template>
        </SiteSection>

        <section class="shell pb-32 md:pb-40" :aria-label="t('aboutPage.nowLabel')">
            <AboutNow />
        </section>
    </div>
</template>
