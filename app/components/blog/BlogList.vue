<script setup lang="ts">
import type { BlogPostItem } from "~/composables/useBlog";

defineProps<{ posts: BlogPostItem[]; full?: boolean }>();
</script>

<template>
    <ol class="border-b border-hairline">
        <li v-for="(p, i) in posts" :key="p.path">
            <BlogRow :post="p" :index="i" :full="full" />
        </li>
    </ol>
</template>
