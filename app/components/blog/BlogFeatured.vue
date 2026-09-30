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
        class="group grid-12 gap-y-6 rounded-lg border border-gold-line bg-surface p-6 no-underline transition-colors hover:bg-elevated md:p-12"
    >
        <div class="col-span-4 flex flex-col gap-5 md:col-span-7">
            <span class="eyebrow text-gold"
                >{{ t("blog.latest") }} · {{ fmt.date(post.date) }}</span
            >
            <span
                class="font-display text-[2.5rem] leading-[0.95] font-semibold tracking-[-0.045em] text-balance md:text-[4rem]"
                >{{ post.title }}</span
            >
        </div>
        <div class="col-span-4 flex flex-col justify-between gap-6 md:col-span-4 md:col-start-9">
            <p v-if="post.description" class="text-[17px] leading-relaxed text-subtle md:text-lg">
                {{ post.description }}
            </p>
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
