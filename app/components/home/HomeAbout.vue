<script setup lang="ts">
const { t } = useI18n();
const facts = ["basedIn", "focus", "primary", "also"] as const;
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
                    <AboutFacts :keys="facts" />
                </SiteReveal>
                <SiteReveal :delay="0.2" class="col-span-4 flex flex-col gap-5 text-[17px] leading-relaxed text-subtle md:col-span-5 md:col-start-7 md:text-[19px]">
                    <p><span class="text-foreground">{{ t("about.p1a") }}</span> {{ t("about.p1b") }}</p>
                    <p>{{ t("about.p2") }}</p>
                    <UiButton as-child variant="link" size="inline" class="self-start">
                        <NuxtLinkLocale to="/about">{{ t("about.more") }} <SiteArrow /></NuxtLinkLocale>
                    </UiButton>
                </SiteReveal>
            </div>

            <div class="mt-24 md:mt-36">
                <span class="eyebrow text-subtle">{{ t("about.method") }}</span>
                <AboutMethod class="mt-6" />
            </div>
        </template>
    </SiteSection>
</template>
