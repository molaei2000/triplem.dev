<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
    <section id="work" class="shell scroll-mt-24 pb-32 md:pb-40" aria-labelledby="work-title">
        <SiteSectionHeader :label="t('work.label')" :caption="t('work.caption')" coord="y · 4600" />

        <div class="mt-10 grid-12 items-end gap-y-6 md:mt-18">
            <h2 id="work-title" class="col-span-4 font-display text-[4rem] leading-[0.88] font-semibold tracking-[-0.05em] md:col-span-8 md:text-[9.375rem] md:leading-[0.85] md:tracking-[-0.055em]">
                {{ t("work.title") }}<sup class="eyebrow ms-3 align-top text-sm text-gold">(03)</sup>
            </h2>
            <p class="col-span-4 text-[17px] leading-relaxed text-subtle">{{ t("work.intro") }}</p>
        </div>

        <!-- featured: bleeds past the grid margin on desktop -->
        <SiteReveal class="mt-12 -mx-4 md:mt-22 md:-mx-10">
            <NuxtLinkLocale to="/work" class="group block no-underline">
                <div class="relative h-[300px] overflow-hidden border-y border-gold-line bg-surface md:h-[760px] md:rounded-md md:border">
                    <div class="visual absolute inset-0 transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]">
                        <div class="absolute start-[14%] top-[14%] h-[90%] w-[72%] overflow-hidden rounded-lg border border-hairline-strong bg-elevated shadow-(--shadow-lift)">
                            <div class="flex h-10 items-center gap-1.5 border-b border-hairline px-4">
                                <span v-for="d in 3" :key="d" class="size-2 rounded-full bg-hairline-strong" />
                            </div>
                            <div class="grid h-full grid-cols-3 grid-rows-[120px_1fr] gap-4 p-8">
                                <span class="rounded-md border border-hairline" />
                                <span class="rounded-md border border-hairline" />
                                <span class="rounded-md border border-gold-line bg-gold-soft" />
                                <span class="col-span-3 rounded-md border border-hairline bg-[linear-gradient(180deg,transparent_60%,var(--gold-soft))]" />
                            </div>
                        </div>
                    </div>
                    <span class="eyebrow absolute start-4 top-3.5 text-subtle md:start-8 md:top-7">01 — {{ t("work.featured") }}</span>
                    <span class="eyebrow absolute end-4 top-3.5 text-subtle md:end-8 md:top-7">{{ t("work.items.0.year") }}</span>
                    <span class="eyebrow absolute start-4 bottom-3.5 text-faint md:start-8 md:bottom-7">{{ t("work.screenshot") }}</span>
                    <span
                        aria-hidden="true"
                        class="absolute start-[58%] top-[42%] hidden size-24 scale-75 place-items-center rounded-full bg-gold font-mono text-xs font-medium tracking-[0.12em] text-on-gold opacity-0 transition duration-500 ease-out-expo group-hover:scale-100 group-hover:opacity-100 md:grid"
                    >{{ t("work.view").toUpperCase() }}</span>
                </div>
                <div class="grid-12 items-start gap-y-4 px-4 pt-6 md:px-10 md:pt-8">
                    <span class="col-span-1 hidden font-display text-[3.5rem] leading-none font-medium tracking-[-0.03em] text-gold md:block">01</span>
                    <div class="col-span-4 flex flex-col gap-3 transition-transform duration-500 ease-out-expo group-hover:translate-x-2.5 md:col-span-7 rtl:group-hover:-translate-x-2.5">
                        <h3 class="flex items-center gap-5 font-display text-[2rem] leading-none font-medium tracking-[-0.035em] md:text-[3.5rem]">
                            {{ t("work.items.0.name") }}
                            <span class="text-[0.7em] text-gold transition-transform duration-500 ease-out-expo group-hover:translate-x-1.5 rtl:-scale-x-100">→</span>
                        </h3>
                        <p class="max-w-[620px] text-[15px] leading-normal text-subtle md:text-[19px]">{{ t("work.items.0.desc") }}</p>
                    </div>
                    <dl class="col-span-4 grid grid-cols-[80px_1fr] gap-y-2.5 text-[15px] md:col-span-4">
                        <dt class="eyebrow pt-0.5 text-faint">{{ t("work.role") }}</dt><dd>{{ t("work.items.0.role") }}</dd>
                        <dt class="eyebrow pt-0.5 text-faint">{{ t("work.stack") }}</dt><dd class="text-gold">{{ t("work.items.0.stack") }}</dd>
                        <dt class="eyebrow pt-0.5 text-faint">{{ t("work.type") }}</dt><dd>{{ t("work.caseStudy") }}</dd>
                    </dl>
                </div>
            </NuxtLinkLocale>
        </SiteReveal>

        <!-- two medium cards, staggered for rhythm -->
        <div class="mt-16 grid grid-cols-2 items-start gap-4 md:mt-40 md:grid-cols-12 md:gap-6">
            <SiteReveal v-for="i in [1, 2]" :key="i" :class="i === 1 ? 'md:col-span-7' : 'mt-12 md:col-span-5 md:mt-44'">
                <NuxtLinkLocale to="/work" class="group flex flex-col gap-5 no-underline">
                    <div class="relative overflow-hidden rounded-md border border-hairline bg-surface transition-colors group-hover:border-gold-line" :class="i === 1 ? 'h-50 md:h-[520px]' : 'h-50 md:h-[620px]'">
                        <div class="absolute inset-[12%] rounded-lg border border-hairline-strong bg-elevated transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]">
                            <span class="absolute inset-x-[10%] top-[14%] h-[28%] rounded border border-gold-line bg-gold-soft" />
                            <span class="absolute inset-x-[10%] top-[50%] h-2.5 w-1/2 rounded-sm bg-hairline-strong" />
                            <span class="absolute inset-x-[10%] top-[58%] h-2.5 w-1/3 rounded-sm bg-hairline" />
                        </div>
                        <span class="eyebrow absolute start-4 bottom-3.5 hidden text-faint md:block">{{ t("work.screenshot") }}</span>
                    </div>
                    <div class="flex items-baseline gap-4 md:gap-6">
                        <span class="font-display text-lg text-subtle md:text-[1.75rem]">0{{ i + 1 }}</span>
                        <div class="flex flex-col gap-2">
                            <h3 class="font-display text-[1.2rem] leading-tight font-medium tracking-[-0.02em] md:text-[2.5rem] md:tracking-[-0.03em]">{{ t(`work.items.${i}.name`) }}</h3>
                            <p class="hidden text-[17px] text-subtle md:block">{{ t(`work.items.${i}.desc`) }}</p>
                            <span class="eyebrow mt-1.5 hidden text-subtle md:block">{{ t(`work.items.${i}.stack`) }}</span>
                        </div>
                    </div>
                </NuxtLinkLocale>
            </SiteReveal>
        </div>
    </section>
</template>
