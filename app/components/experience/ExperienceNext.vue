<script setup lang="ts">
/**
 * The open chapter at the top of the timeline while `meta.openToWork` is set: same layout as
 * `ExperienceEntry`, with the gold "current" node and a link to the contact form.
 */
defineProps<{ chapter: number }>();
const { t } = useI18n();
</script>

<template>
    <span aria-hidden="true" class="absolute start-0 top-2 flex size-[9px] md:start-[120px]">
        <span class="absolute inline-flex size-full bg-gold opacity-60 motion-safe:animate-ping" />
        <span class="relative inline-flex size-full bg-gold" />
    </span>
    <span class="eyebrow shrink-0 pb-2.5 text-gold md:w-[100px] md:pt-2.5 md:pb-0 md:text-end">{{
        t("availability.when")
    }}</span>

    <div class="flex min-w-0 max-w-180 flex-1 flex-col gap-3 md:ms-18">
        <span class="eyebrow text-faint"
            >{{ t("experience.chapter") }} 0{{ chapter }} · {{ t("availability.badge") }}</span
        >
        <h3
            class="font-display text-[1.625rem] leading-[1.05] font-medium tracking-[-0.025em] md:text-[2.5rem]"
        >
            {{ t("availability.title") }}
        </h3>
        <p class="text-[15px] leading-relaxed text-subtle md:text-[17px]">
            {{ t("availability.body") }}
        </p>
        <UiButton as-child variant="gold" size="lg" class="mt-3 self-start">
            <NuxtLinkLocale :to="{ path: '/contact', query: { topic: 'role' } }"
                >{{ t("availability.cta") }} <SiteArrow
            /></NuxtLinkLocale>
        </UiButton>
    </div>
</template>
