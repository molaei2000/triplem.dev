<script setup lang="ts">
/**
 * "Open to work" pill. Links to the contact form with the Role topic preselected. Renders
 * nothing unless `meta.openToWork` is set.
 */
import meta from "~/app.meta";

const { t } = useI18n();
</script>

<template>
    <NuxtLinkLocale
        v-if="meta.openToWork"
        :to="{ path: '/contact', query: { topic: 'role' } }"
        :aria-label="t('availability.badgeLabel')"
        class="eyebrow inline-flex w-fit items-center gap-2 rounded-full border border-gold-line bg-gold-soft px-3 py-1.5 text-gold no-underline transition-colors hover:border-gold"
    >
        <span aria-hidden="true" class="relative flex size-1.5">
            <span
                class="absolute inline-flex size-full rounded-full bg-gold opacity-60 motion-safe:animate-ping"
            />
            <span class="relative inline-flex size-1.5 rounded-full bg-gold" />
        </span>
        {{ t("availability.badge") }}
    </NuxtLinkLocale>
</template>
