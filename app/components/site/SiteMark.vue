<script setup lang="ts">
/**
 * The triplem.dev mark: three parallel slashes (///), the middle one gold.
 * Stroke weight scales inversely with size so it survives favicon sizes.
 */
const props = withDefaults(defineProps<{ size?: number; muted?: boolean; stroke?: number }>(), {
    size: 24,
    muted: false,
    stroke: undefined,
});

const sw = computed(() => {
    if (props.stroke) return props.stroke;
    if (props.size <= 20) return 5;
    if (props.size <= 32) return 4.4;
    if (props.size <= 64) return 3.4;
    return 2.6;
});
</script>

<template>
    <svg
        :width="size"
        :height="size"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        :class="muted ? 'text-subtle' : 'text-foreground'"
    >
        <path d="M6 42L18 6" stroke="currentColor" :stroke-width="sw" />
        <path d="M18 42L30 6" stroke="var(--gold)" :stroke-width="sw" />
        <path d="M30 42L42 6" stroke="currentColor" :stroke-width="sw" />
    </svg>
</template>
