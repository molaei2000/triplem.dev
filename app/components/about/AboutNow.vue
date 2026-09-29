<script setup lang="ts">
/** "Now": what's in progress, dated so it doesn't silently go stale. */
const { t } = useI18n();
</script>

<template>
    <div class="grid-12 items-end gap-y-8 rounded-lg border border-gold-line bg-gold-soft p-6 md:p-12">
        <div class="col-span-4 flex flex-col gap-4 md:col-span-8">
            <span class="eyebrow text-gold">{{ t("aboutPage.nowLabel") }} · {{ t("aboutPage.nowUpdated", { date: t("aboutPage.nowDate") }) }}</span>
            <p class="font-display text-2xl leading-snug tracking-[-0.015em] text-balance md:text-[2.25rem]">{{ t("aboutPage.now") }}</p>
        </div>
        <div class="col-span-4 md:col-span-4 md:justify-self-end">
            <UiButton as-child variant="gold" size="lg">
                <NuxtLinkLocale to="/contact">{{ t("aboutPage.nowCta") }} <SiteArrow /></NuxtLinkLocale>
            </UiButton>
        </div>
    </div>
</template>
