<script setup lang="ts">
const { t } = useI18n();
const items = [0, 1, 2, 3];
</script>

<template>
    <section id="notes" class="shell scroll-mt-24 pb-32 md:pb-40" aria-labelledby="notes-title">
        <SiteSectionHeader :label="t('notes.label')" :caption="t('notes.caption')" coord="y · 7400" />

        <div class="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
            <h2
                id="notes-title"
                class="text-outline -ms-2 font-display text-[9.5rem] leading-[0.8] font-semibold tracking-[-0.06em] md:-ms-[112px] md:text-[20rem]"
            >{{ t("notes.title") }}</h2>
            <p class="max-w-[360px] text-[17px] leading-relaxed text-subtle md:mb-3">{{ t("notes.intro") }}</p>
        </div>

        <ol class="mt-10 border-b border-hairline md:mt-18">
            <li v-for="i in items" :key="i">
                <NuxtLinkLocale
                    to="/notes"
                    class="group grid-12 items-center gap-y-2 border-t py-6 no-underline md:py-10"
                    :class="i === 0 ? 'border-hairline-strong' : 'border-hairline'"
                >
                    <span class="eyebrow col-span-4 text-subtle group-hover:text-gold md:col-span-1" :class="i === 0 && 'text-gold'">
                        0{{ i + 1 }}<span class="md:hidden"> · {{ t(`notes.items.${i}.date`) }}</span>
                    </span>
                    <span class="col-span-4 font-display text-2xl leading-[1.08] font-medium tracking-[-0.02em] transition-transform duration-500 ease-out-expo group-hover:translate-x-2.5 md:col-span-6 md:text-[2.75rem] md:tracking-[-0.03em] rtl:group-hover:-translate-x-2.5">
                        {{ t(`notes.items.${i}.title`) }}
                    </span>
                    <span class="eyebrow col-span-4 text-subtle md:col-span-2">{{ t(`notes.items.${i}.tags`) }}</span>
                    <span class="hidden flex-col gap-1 text-[15px] text-subtle md:col-span-2 md:flex">
                        <span>{{ t(`notes.items.${i}.date`) }}</span>
                        <span>{{ t("notes.read", { n: t(`notes.items.${i}.min`) }) }}</span>
                    </span>
                    <span
                        aria-hidden="true"
                        class="hidden justify-self-end text-[1.75rem] text-subtle transition duration-500 ease-out-expo group-hover:translate-x-1.5 group-hover:text-gold md:col-span-1 md:block rtl:-scale-x-100"
                    >→</span>
                </NuxtLinkLocale>
            </li>
        </ol>
    </section>
</template>
