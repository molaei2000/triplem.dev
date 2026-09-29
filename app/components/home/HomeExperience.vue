<script setup lang="ts">
import { experience } from "~/data/experience";

const { t } = useI18n();
</script>

<template>
    <SiteSection id="experience" :label="t('experience.label')" :caption="t('experience.caption')" coord="y · 3250">
        <template #default="{ titleId }">
            <div class="mt-12 grid-12 gap-y-10 md:mt-18">
                <div class="col-span-4 flex flex-col gap-3.5 md:sticky md:top-32 md:col-span-3 md:self-start">
                    <h2 :id="titleId" class="font-display text-5xl leading-none font-medium tracking-[-0.035em] md:text-[4rem]">{{ t("experience.title") }}</h2>
                    <span class="eyebrow text-subtle">{{ t("experience.sub") }}</span>
                </div>

                <ol class="relative col-span-4 md:col-span-9">
                    <!-- rail + scroll-drawn gold line -->
                    <li aria-hidden="true" class="absolute start-1 top-3 bottom-0 w-px bg-hairline-strong md:start-[124px]" />
                    <li aria-hidden="true" class="draw absolute start-1 top-3 bottom-0 w-px origin-top bg-gold md:start-[124px]" />

                    <li
                        v-for="(entry, i) in experience"
                        :key="entry.id"
                        class="relative flex flex-col ps-8 pb-20 last:pb-4 md:flex-row md:ps-0 md:pb-28"
                    >
                        <ExperienceEntry :entry="entry" :chapter="experience.length - i" :current="i === 0" />
                    </li>
                </ol>
            </div>
        </template>
    </SiteSection>
</template>

<style scoped>
/* The gold line draws as the section scrolls through the viewport.
   Progressive enhancement: browsers without scroll timelines show it full. */
@supports (animation-timeline: view()) {
    .draw {
        animation: draw linear both;
        animation-timeline: view();
        animation-range: entry 10% cover 60%;
    }
    @keyframes draw {
        from { transform: scaleY(0); }
        to { transform: scaleY(1); }
    }
}

@media (prefers-reduced-motion: reduce) {
    .draw { animation: none; transform: none; }
}
</style>
