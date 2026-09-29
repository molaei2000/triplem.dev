<script setup lang="ts">
/** A button that copies `value` and briefly announces it did. Variant/size fall through to <UiButton>. */
const props = defineProps<{ value: string; label: string; copiedLabel: string }>();
const { copy, copied } = useCopy(() => props.value);
</script>

<template>
    <UiButton type="button" @click="copy()">
        <span aria-live="polite">{{ copied ? copiedLabel : label }}</span>
    </UiButton>
</template>
