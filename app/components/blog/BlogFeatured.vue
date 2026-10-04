<script setup lang="ts">
/** The newest post, promoted above the list on /blog. */
import type { BlogPostItem } from "~/composables/useBlog";

const props = defineProps<{ post: BlogPostItem }>();
const { t } = useI18n();
const fmt = useBlogFormat();
const meta = computed(() => [...(props.post.tags ?? []), fmt.read(props.post.minutes)].join(" · "));
</script>

<template>
    <NuxtLink
        :to="post.path"
        class="group grid-12 items-stretch gap-y-6 rounded-lg border border-gold-line bg-surface p-3 no-underline transition-colors hover:bg-elevated md:p-4"
    >
        <BlogCover :src="post.cover" eager mark class="col-span-4 self-center md:col-span-7" />
        <div
            class="col-span-4 flex flex-col justify-between gap-6 px-3 pb-3 md:col-span-5 md:py-6 md:ps-2 md:pe-6"
        >
            <div class="flex flex-col gap-5">
                <span class="eyebrow text-gold"
                    >{{ t("blog.latest") }} · {{ fmt.date(post.date) }}</span
                >
                <span
                    class="font-display text-[2.25rem] leading-[0.98] font-semibold tracking-[-0.04em] text-balance md:text-[2.5rem] lg:text-[3rem]"
                    >{{ post.title }}</span
                >
                <p v-if="post.description" class="text-[17px] leading-relaxed text-subtle">
                    {{ post.description }}
                </p>
            </div>
            <span class="flex items-center justify-between gap-4">
                <span class="eyebrow text-subtle">{{ meta }}</span>
                <span class="inline-flex shrink-0 items-center gap-1.5 text-[15px] text-gold">
                    {{ t("blog.readPost") }}
                    <SiteArrow
                        class="transition-transform duration-500 ease-out-expo group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                    />
                </span>
            </span>
        </div>
    </NuxtLink>
</template>
