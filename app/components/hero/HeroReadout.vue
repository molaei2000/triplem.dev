<script setup lang="ts">
/** Live caption for the 3D mark: which slash is active, or how to interact. */
defineProps<{ state: string }>();
const { t } = useI18n();
</script>

<template>
    <div aria-live="polite" class="flex flex-col gap-1.5">
        <span class="eyebrow text-gold">{{ t(`hero.readout.${state}.num`) }}</span>
        <span class="font-display text-xl font-medium tracking-[-0.01em]">{{
            t(`hero.readout.${state}.name`)
        }}</span>
        <span class="text-sm leading-snug text-subtle">{{ t(`hero.readout.${state}.desc`) }}</span>
    </div>
</template>
