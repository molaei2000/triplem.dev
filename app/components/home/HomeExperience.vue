<script setup lang="ts">
const { t } = useI18n();
const items = [0, 1, 2];
</script>

<template>
    <section id="experience" class="shell scroll-mt-24 pb-32 md:pb-40" aria-labelledby="exp-title">
        <SiteSectionHeader :label="t('experience.label')" :caption="t('experience.caption')" coord="y · 3250" />

        <div class="mt-12 grid-12 gap-y-10 md:mt-18">
            <div class="col-span-4 flex flex-col gap-3.5 md:col-span-3">
                <h2 id="exp-title" class="font-display text-5xl leading-none font-medium tracking-[-0.035em] md:text-[4rem]">{{ t("experience.title") }}</h2>
                <span class="eyebrow text-subtle">{{ t("experience.sub") }}</span>
            </div>

            <ol class="timeline relative col-span-4 md:col-span-9">
                <!-- rail + scroll-drawn gold line -->
                <li aria-hidden="true" class="absolute start-1 top-3 bottom-0 w-px bg-hairline-strong md:start-[124px]" />
                <li aria-hidden="true" class="draw absolute start-1 top-3 bottom-0 w-px origin-top bg-gold md:start-[124px]" />

                <li v-for="i in items" :key="i" class="relative flex flex-col ps-8 pb-16 last:pb-4 md:flex-row md:ps-0 md:pb-22">
                    <span
                        aria-hidden="true"
                        class="absolute start-0 top-2 size-[9px] md:start-[120px]"
                        :class="i < 2 ? 'bg-gold' : 'border border-hairline-strong bg-background'"
                    />
                    <span class="eyebrow shrink-0 pb-2.5 md:w-[100px] md:pt-2.5 md:pb-0 md:text-end" :class="i === 0 ? 'text-gold' : 'text-subtle'">
                        {{ t(`experience.items.${i}.years`) }}
                    </span>
                    <div class="flex max-w-[680px] flex-col gap-3 md:ms-[72px]">
                        <span class="eyebrow hidden text-faint md:block">{{ t("experience.chapter") }} 0{{ 3 - i }}</span>
                        <h3 class="font-display text-[1.625rem] leading-[1.05] font-medium tracking-[-0.025em] md:text-[2.5rem]">{{ t(`experience.items.${i}.role`) }}</h3>
                        <p class="text-[15px] md:text-[19px]">
                            {{ t(`experience.items.${i}.company`) }} <span class="text-subtle">— {{ t(`experience.items.${i}.where`) }}</span>
                        </p>
                        <p class="text-[15px] leading-relaxed text-subtle md:text-[17px]">{{ t(`experience.items.${i}.desc`) }}</p>
                        <div v-if="t(`experience.items.${i}.stack`)" class="mt-1.5 flex flex-wrap gap-2">
                            <span
                                v-for="s in t(`experience.items.${i}.stack`).split(' · ')"
                                :key="s"
                                class="rounded border border-hairline px-2.5 py-1.5 font-mono text-[11px] tracking-[0.06em] text-subtle"
                            >{{ s }}</span>
                        </div>
                    </div>
                </li>
            </ol>
        </div>
    </section>
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
