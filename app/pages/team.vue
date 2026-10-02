<script setup lang="ts">
import meta from "~/app.meta";
import { COLLABORATORS, CORE_TEAM } from "~/data/team";

const { t, locale } = useI18n();
const localePath = useLocalePath();

useSeoMeta({
    title: () => t("teamPage.metaTitle"),
    description: () => t("teamPage.metaDescription"),
    ogTitle: () => `${t("teamPage.title")} — ${t("teamPage.metaTitle")}`,
    ogDescription: () => t("teamPage.metaDescription"),
    ogType: "website",
});

useJsonLd(() => ({
    "@type": "AboutPage",
    url: `${meta.siteUrl}${localePath("/team")}`,
    inLanguage: locale.value === "fa" ? "fa-IR" : "en-US",
    mainEntity: {
        "@type": "Organization",
        name: meta.name,
        url: meta.siteUrl,
        founder: { "@type": "Person", name: meta.author.name, url: meta.siteUrl },
        member: [...CORE_TEAM, ...COLLABORATORS].map((m) => ({
            "@type": "Person",
            name: t(`teamPage.people.${m.id}.name`),
            jobTitle: t(`teamPage.roles.${m.role}`),
        })),
    },
}));

// One slash index (-1: none) shared by the 3D mark and the core cards.
const stageHover = shallowRef(-1);
const cardHover = shallowRef(-1);
/** A tapped slash stays selected: touch screens have no hover. */
const pinned = shallowRef(-1);
const active = computed(
    () => [pinned.value, stageHover.value, cardHover.value].find((i) => i >= 0) ?? -1,
);
const selected = computed(() => (pinned.value >= 0 ? pinned.value : cardHover.value));

function onTap(i: number) {
    pinned.value = i === pinned.value ? -1 : i;
}
</script>

<template>
    <div>
        <TeamHero :active="active" :selected="selected" @hover="stageHover = $event" @tap="onTap" />

        <SiteSection
            id="core"
            :label="t('teamPage.coreLabel')"
            :caption="t('teamPage.coreCaption')"
            coord="M · M · M"
        >
            <template #default="{ titleId }">
                <h2 :id="titleId" class="sr-only">{{ t("teamPage.coreCaption") }}</h2>
                <TeamCore class="mt-10 md:mt-14" :active="active" @hover="cardHover = $event" />
            </template>
        </SiteSection>

        <SiteSection
            id="collaborators"
            :label="t('teamPage.collabLabel')"
            :caption="t('teamPage.collabCaption')"
            coord="+4"
        >
            <template #default="{ titleId }">
                <h2 :id="titleId" class="sr-only">{{ t("teamPage.collabCaption") }}</h2>
                <p
                    class="mt-10 max-w-[560px] text-[17px] leading-relaxed text-subtle md:mt-14 md:text-[19px]"
                >
                    {{ t("teamPage.collabIntro") }}
                </p>
                <TeamCollaborators class="mt-10 md:mt-14" />
            </template>
        </SiteSection>

        <section class="shell pb-32 md:pb-40" :aria-label="t('teamPage.ctaLabel')">
            <TeamCta />
        </section>
    </div>
</template>
