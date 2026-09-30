<script setup lang="ts">
/**
 * Decorative arrow that follows reading direction: `forward`, `back` and
 * `external` mirror in RTL, `up`/`down` don't.
 */
const props = withDefaults(
    defineProps<{ direction?: "forward" | "back" | "external" | "up" | "down" }>(),
    {
        direction: "forward",
    },
);

const icon = computed(
    () =>
        ({
            forward: "tm:arrow-right",
            back: "tm:arrow-left",
            external: "tm:arrow-up-right",
            up: "tm:arrow-up",
            down: "tm:arrow-down",
        })[props.direction],
);
const mirrors = computed(
    () =>
        props.direction === "forward" ||
        props.direction === "back" ||
        props.direction === "external",
);
</script>

<template>
    <Icon :name="icon" aria-hidden="true" :class="mirrors && 'rtl:-scale-x-100'" />
</template>
