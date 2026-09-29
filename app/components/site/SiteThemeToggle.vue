<script setup lang="ts">
const { t } = useI18n();
const { isDark, toggle } = useTheme();
</script>

<template>
    <button
        type="button"
        class="grid size-10 place-items-center rounded-[9px] border border-hairline text-foreground transition-colors hover:border-gold-line"
        :aria-label="t('nav.theme')"
        :aria-pressed="!isDark"
        @click="toggle"
    >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" stroke-width="1.3" />
            <path d="M9 1.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor" />
        </svg>
    </button>
</template>
