<script setup lang="ts">
import type { BlogPostItem } from "~/composables/useBlog";

/** `start` is how many posts come before this list (earlier pages), so numbering carries on. */
withDefaults(defineProps<{ posts: BlogPostItem[]; full?: boolean; start?: number }>(), {
    start: 0,
});
</script>

<template>
    <ol class="border-b border-hairline">
        <li v-for="(p, i) in posts" :key="p.path">
            <BlogRow :post="p" :index="start + i" :first="i === 0" :full="full" />
        </li>
    </ol>
</template>
