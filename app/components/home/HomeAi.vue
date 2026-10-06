<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
    <SiteSection id="ai" :label="t('ai.label')" :caption="t('ai.caption')" coord="y · 3250">
        <template #default="{ titleId }">
            <div class="mt-12 grid-12 items-start gap-y-10 md:mt-18">
                <SiteReveal class="col-span-4 md:col-span-7">
                    <h2
                        :id="titleId"
                        class="font-display text-[2.75rem] leading-[1] font-medium tracking-[-0.035em] text-balance md:text-[5rem] md:leading-[0.96] md:tracking-[-0.04em]"
                    >
                        <span class="block text-subtle">{{ t("ai.t1") }}</span>
                        <span class="block">{{ t("ai.t2") }}<span class="text-gold">.</span></span>
                    </h2>
                </SiteReveal>
                <SiteReveal
                    :delay="0.1"
                    class="col-span-4 flex flex-col gap-5 text-[17px] leading-relaxed text-subtle md:col-span-4 md:col-start-9"
                >
                    <p>
                        <span class="text-foreground">{{ t("ai.p1a") }}</span>
                        {{ t("ai.p1b") }}
                    </p>
                    <p>{{ t("ai.p2") }}</p>
                </SiteReveal>
            </div>

            <AiModes class="mt-16 md:mt-24" />

            <div class="mt-20 md:mt-32">
                <span class="eyebrow text-subtle">{{ t("ai.fig") }}</span>
                <AiLoop class="mt-8" />
            </div>

            <div class="mt-20 md:mt-32">
                <span class="eyebrow text-subtle">{{ t("ai.toolkit") }}</span>
                <AiToolkit class="mt-6" />
            </div>
        </template>
    </SiteSection>
</template>
