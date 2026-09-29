<script setup lang="ts">
/** The oversized hairline-outlined display title (Blog). */
withDefaults(defineProps<{ as?: "h1" | "h2" }>(), { as: "h2" });
</script>

<template>
    <component
        :is="as"
        class="text-outline -ms-2 font-display text-[9.5rem] leading-[0.8] font-semibold tracking-[-0.06em] md:-ms-[112px] md:text-[20rem]"
    >
        <slot />
    </component>
</template>
