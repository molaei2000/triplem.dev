<script setup lang="ts">
import type { BlogPostItem } from "~/composables/useBlog";

const props = defineProps<{ post: BlogPostItem; index: number; full?: boolean }>();
const { t } = useI18n();
const fmt = useBlogFormat();
const first = computed(() => props.index === 0);
const number = computed(() => String(props.index + 1).padStart(2, "0"));
</script>

<template>
    <NuxtLink
        :to="post.path"
        class="group grid-12 items-center gap-y-2 border-t py-6 no-underline md:py-10"
        :class="first ? 'border-hairline-strong' : 'border-hairline'"
    >
        <span class="eyebrow col-span-4 md:col-span-1" :class="first ? 'text-gold' : 'text-subtle group-hover:text-gold'">
            {{ number }}<span class="md:hidden"> · {{ fmt.date(post.date) }}</span>
        </span>
        <span class="col-span-4 flex flex-col gap-2.5 transition-transform duration-500 ease-out-expo group-hover:translate-x-2.5 md:col-span-6 rtl:group-hover:-translate-x-2.5">
            <span
                class="font-display leading-[1.08] font-medium tracking-[-0.02em] md:tracking-[-0.03em]"
                :class="full ? 'text-2xl md:text-[2.375rem]' : 'text-2xl md:text-[2.75rem]'"
            >
                {{ post.title }}
                <UiBadge v-if="post.draft" variant="gold" class="ms-2 align-middle">{{ t("blog.draft") }}</UiBadge>
            </span>
            <span v-if="full && post.description" class="max-w-[620px] text-[15px] leading-normal text-subtle">{{ post.description }}</span>
        </span>
        <span class="eyebrow col-span-4 text-subtle md:col-span-2">{{ post.tags?.join(" · ") }}</span>
        <span class="hidden flex-col gap-1 text-[15px] text-subtle md:col-span-2 md:flex">
            <span>{{ fmt.date(post.date) }}</span>
            <span>{{ fmt.read(post.minutes) }}</span>
        </span>
        <SiteArrow
            class="hidden justify-self-end text-[1.75rem] text-subtle transition duration-500 ease-out-expo group-hover:translate-x-1.5 group-hover:text-gold md:col-span-1 md:block rtl:group-hover:-translate-x-1.5"
        />
    </NuxtLink>
</template>
