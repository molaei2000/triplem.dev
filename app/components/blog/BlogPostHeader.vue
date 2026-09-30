<script setup lang="ts">
const props = defineProps<{
    title: string;
    date: string;
    tags: string[];
    minutes?: number;
    draft?: boolean;
}>();
const { t } = useI18n();
const fmt = useBlogFormat();
const published = computed(() => new Date(props.date).toISOString());
</script>

<template>
    <header class="shell grid-12 pt-20 md:pt-[120px]">
        <div class="col-span-4 flex items-center gap-4 md:col-span-9 md:col-start-4">
            <NuxtLinkLocale
                to="/blog"
                class="eyebrow inline-flex items-center gap-1.5 text-subtle no-underline hover:text-gold"
            >
                <SiteArrow direction="back" /> {{ t("blog.back") }}
            </NuxtLinkLocale>
            <span aria-hidden="true" class="eyebrow text-faint">/</span>
            <span v-if="tags[0]" class="eyebrow text-gold">{{ tags[0] }}</span>
            <UiBadge v-if="draft" variant="gold">{{ t("blog.draft") }}</UiBadge>
        </div>
        <h1
            class="col-span-4 mt-8 font-display text-[2.75rem] leading-[0.95] font-semibold tracking-[-0.045em] text-balance md:col-span-8 md:col-start-4 md:mt-10 md:text-[5.5rem] md:leading-[0.92] md:tracking-[-0.05em]"
        >
            {{ title }}
        </h1>
        <div
            class="col-span-4 mt-8 flex flex-wrap items-center gap-x-10 gap-y-3 border-y border-hairline py-4.5 text-[15px] text-subtle md:col-span-9 md:col-start-4 md:mt-12"
        >
            <time :datetime="published">{{ fmt.date(date, true) }}</time>
            <span>{{ fmt.read(minutes) }}</span>
            <span class="flex flex-wrap gap-2">
                <UiBadge v-for="x in tags" :key="x" variant="outline">{{ x }}</UiBadge>
            </span>
        </div>
    </header>
</template>
