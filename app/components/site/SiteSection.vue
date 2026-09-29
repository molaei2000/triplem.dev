<script setup lang="ts">
/**
 * A homepage chapter: anchor target, 12-col shell and the eyebrow header.
 * The heading inside the slot should use `titleId` so the section is labelled.
 */
const props = defineProps<{ id: string; label: string; caption?: string; coord?: string }>();
const titleId = computed(() => `${props.id}-title`);
</script>

<template>
    <section :id="id" class="shell scroll-mt-24 pb-32 md:pb-40" :aria-labelledby="titleId">
        <SiteSectionHeader :label="label" :caption="caption" :coord="coord" />
        <slot :title-id="titleId" />
    </section>
</template>
