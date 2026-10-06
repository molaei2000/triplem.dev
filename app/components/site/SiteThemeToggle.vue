<script setup lang="ts">
const { t } = useI18n();
const { isDark, toggle } = useTheme();
</script>

<template>
    <UiButton
        variant="outline"
        size="icon"
        class="border-hairline text-foreground"
        :aria-label="t('nav.theme')"
        :aria-pressed="!isDark"
        @click="toggle"
    >
        <Icon :name="isDark ? 'tm:sun-loop' : 'tm:moon-loop'" />
    </UiButton>
</template>
