<script setup lang="ts">
defineProps<{ label: string; caption?: string; coord?: string }>();
</script>

<template>
    <div class="grid-12 border-b border-hairline pb-4">
        <span class="eyebrow col-span-2 text-gold md:col-span-3">{{ label }}</span>
        <span v-if="caption" class="eyebrow col-span-2 hidden text-subtle sm:block md:col-span-6">{{ caption }}</span>
        <span v-if="coord" aria-hidden="true" class="eyebrow col-span-3 hidden text-end text-faint md:block">{{ coord }}</span>
    </div>
</template>
