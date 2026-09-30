<script setup lang="ts">
/**
 * The triplem.dev mark: three parallel slashes (///), one of them gold.
 * The SVG lives in assets/icons/mark.svg (`tm:mark`); this wrapper sets its
 * CSS variables. Stroke weight scales inversely with size so it survives
 * favicon sizes.
 */
const props = withDefaults(
    defineProps<{
        size?: number;
        /** Explicit stroke width in the 48-unit box; derived from `size` if omitted. */
        stroke?: number;
        /** Which slash is gold (0 = left). */
        accent?: 0 | 1 | 2;
        /** `default`: ink strokes · `muted`: secondary text · `ghost`: hairlines only. */
        tone?: "default" | "muted" | "ghost";
    }>(),
    { size: 24, stroke: undefined, accent: 1, tone: "default" },
);

const strokeWidth = computed(() => {
    if (props.stroke) return props.stroke;
    if (props.size <= 20) return 5;
    if (props.size <= 32) return 4.4;
    if (props.size <= 64) return 3.4;
    return 2.6;
});

const vars = computed(() => {
    const rest = props.tone === "ghost" ? "var(--hairline-strong)" : "currentColor";
    return {
        "--mark-stroke": strokeWidth.value,
        "--mark-1": props.accent === 0 ? "var(--gold)" : rest,
        "--mark-2": props.accent === 1 ? "var(--gold)" : rest,
        "--mark-3": props.accent === 2 ? "var(--gold)" : rest,
    };
});
</script>

<template>
    <Icon
        name="tm:mark"
        mode="svg"
        :size="size"
        aria-hidden="true"
        :class="tone === 'muted' ? 'text-subtle' : 'text-foreground'"
        :style="vars"
    />
</template>
