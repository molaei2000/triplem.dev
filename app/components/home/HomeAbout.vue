<script setup lang="ts">
const { t } = useI18n();
const facts = ["basedIn", "focus", "primary", "also"] as const;
/** Method steps; step N lights up slash N of the mark. */
const steps = [0, 1, 2] as const;
</script>

<template>
    <SiteSection
        id="about"
        :label="t('about.label')"
        :caption="t('about.caption')"
        coord="y · 0940"
        class="pt-28 md:pt-36"
    >
        <template #default="{ titleId }">
            <SiteReveal>
                <h2
                    :id="titleId"
                    class="mt-16 max-w-[954px] font-display text-[2.5rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance md:ms-[calc(3*(100%/12))] md:mt-24 md:text-[5.25rem] md:leading-[0.98] md:tracking-[-0.035em]"
                >
                    {{ t("about.s1") }} <span class="text-subtle">{{ t("about.pixels") }}</span> {{ t("about.s2") }}<span class="text-gold">.</span>
                </h2>
            </SiteReveal>

            <div class="mt-16 grid-12 items-start gap-y-12 md:mt-28">
                <SiteReveal :delay="0.1" class="col-span-4 md:col-span-5">
                    <dl class="grid grid-cols-2 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-10">
                        <div v-for="k in facts" :key="k" class="border-t border-hairline-strong pt-3.5">
                            <dt class="eyebrow text-subtle">{{ t(`about.meta.${k}`) }}</dt>
                            <dd class="mt-2.5 font-display text-lg tracking-[-0.01em] md:text-2xl">{{ t(`about.meta.${k}V`) }}</dd>
                        </div>
                    </dl>
                </SiteReveal>
                <SiteReveal :delay="0.2" class="col-span-4 flex flex-col gap-5 text-[17px] leading-relaxed text-subtle md:col-span-5 md:col-start-7 md:text-[19px]">
                    <p><span class="text-foreground">{{ t("about.p1a") }}</span> {{ t("about.p1b") }}</p>
                    <p>{{ t("about.p2") }}</p>
                </SiteReveal>
            </div>

            <div class="mt-24 md:mt-36">
                <span class="eyebrow text-subtle">{{ t("about.method") }}</span>
                <ol class="mt-6 grid grid-cols-1 gap-y-10 md:grid-cols-3 md:gap-x-6">
                    <li v-for="i in steps" :key="i">
                        <SiteReveal :delay="i * 0.08" class="flex flex-col gap-3.5 border-t border-hairline-strong pt-7">
                            <SiteMark :size="48" :stroke="3.2" :accent="i" tone="ghost" />
                            <span class="eyebrow text-gold">{{ t(`about.m.${i}.n`) }}</span>
                            <h3 class="font-display text-[2.25rem] font-medium tracking-[-0.02em]">{{ t(`about.m.${i}.t`) }}</h3>
                            <p class="max-w-[340px] text-[17px] leading-relaxed text-subtle">{{ t(`about.m.${i}.d`) }}</p>
                        </SiteReveal>
                    </li>
                </ol>
            </div>
        </template>
    </SiteSection>
</template>
