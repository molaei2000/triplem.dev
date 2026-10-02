<script setup lang="ts">
/** "Work with the team": the disciplines we cover, and a way in (Contact, topic preset to collaboration). */
import { TEAM_ROLES } from "~/data/team";

const { t } = useI18n();
</script>

<template>
    <div
        class="grid-12 items-end gap-y-8 rounded-lg border border-gold-line bg-gold-soft p-6 md:p-12"
    >
        <div class="col-span-4 flex flex-col gap-5 md:col-span-8">
            <span class="eyebrow text-gold">{{ t("teamPage.ctaLabel") }}</span>
            <p
                class="font-display text-2xl leading-snug tracking-[-0.015em] text-balance md:text-[2.25rem]"
            >
                {{ t("teamPage.cta") }}
            </p>
            <ul class="flex flex-wrap gap-2">
                <li v-for="r in TEAM_ROLES" :key="r">
                    <UiBadge variant="outline">{{ t(`teamPage.roles.${r}`) }}</UiBadge>
                </li>
            </ul>
        </div>
        <div class="col-span-4 md:col-span-4 md:justify-self-end">
            <UiButton as-child variant="gold" size="lg">
                <NuxtLinkLocale :to="{ path: '/contact', query: { topic: 'collaboration' } }"
                    >{{ t("teamPage.ctaButton") }} <SiteArrow
                /></NuxtLinkLocale>
            </UiButton>
        </div>
    </div>
</template>
