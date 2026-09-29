<script setup lang="ts">
/** The portrait with registration marks and a figure caption. Above the fold on /about, so it loads eagerly. */
const { t } = useI18n();
const corners = ["start-0 top-0 border-s border-t", "end-0 top-0 border-e border-t", "start-0 bottom-0 border-s border-b", "end-0 bottom-0 border-e border-b"];
</script>

<template>
    <figure class="flex flex-col gap-3.5">
        <div class="relative p-3 md:p-4">
            <span v-for="c in corners" :key="c" aria-hidden="true" class="absolute size-5 border-gold-line" :class="c" />
            <NuxtImg
                src="/images/about/portrait.webp"
                :width="1200"
                :height="1500"
                sizes="sm:100vw md:520px"
                format="webp"
                :alt="t('aboutPage.portraitAlt')"
                loading="eager"
                fetchpriority="high"
                preload
                class="block aspect-[4/5] h-auto w-full rounded-md bg-surface object-cover"
            />
        </div>
        <figcaption class="eyebrow ps-3 text-faint md:ps-4">{{ t("aboutPage.figcaption") }}</figcaption>
    </figure>
</template>
