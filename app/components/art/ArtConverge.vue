<script setup lang="ts">
/**
 * Contact illustration: three paths converge into one point. `stacked` is the
 * vertical phone version; `edge` runs into the page edge on desktop and needs
 * `preserveAspectRatio` slicing, which is why this is a component and not an icon.
 */
withDefaults(defineProps<{ variant?: "stacked" | "edge" }>(), { variant: "stacked" });
</script>

<template>
    <svg v-if="variant === 'stacked'" aria-hidden="true" viewBox="0 0 390 220">
        <path d="M120 0C120 110 195 120 195 190" fill="none" stroke="var(--hairline-strong)" />
        <path d="M195 0V190" fill="none" stroke="var(--gold-line)" />
        <path d="M270 0C270 110 195 120 195 190" fill="none" stroke="var(--hairline-strong)" />
        <path d="M195 190V220" fill="none" stroke="var(--gold)" />
        <circle cx="195" cy="190" r="12" fill="none" stroke="var(--gold-line)" class="pulse" />
        <circle cx="195" cy="190" r="4" fill="var(--gold)" />
    </svg>
    <svg v-else aria-hidden="true" viewBox="0 0 1440 1040" preserveAspectRatio="xMaxYMin slice">
        <path d="M1200 0C1200 360 1300 420 1300 760" fill="none" stroke="var(--hairline-strong)" />
        <path d="M1300 0V760" fill="none" stroke="var(--gold-line)" />
        <path d="M1400 0C1400 360 1300 420 1300 760" fill="none" stroke="var(--hairline-strong)" />
        <path d="M1300 760V1040" fill="none" stroke="var(--gold)" />
        <circle cx="1300" cy="760" r="20" fill="none" stroke="var(--gold-line)" class="pulse" />
        <circle cx="1300" cy="760" r="5" fill="var(--gold)" />
    </svg>
</template>

<style scoped>
.pulse {
    animation: pulse 3.2s ease-in-out infinite;
}
@keyframes pulse {
    0%,
    100% {
        opacity: 0.25;
    }
    50% {
        opacity: 0.9;
    }
}
</style>
