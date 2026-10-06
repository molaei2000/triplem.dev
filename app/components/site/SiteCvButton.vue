<script setup lang="ts">
/** Downloads the CV set in `meta.cv`. Renders nothing while no CV is set. */
import meta from "~/app.meta";

const { t } = useI18n();
</script>

<template>
    <UiButton v-if="meta.cv" as-child variant="outline" size="label">
        <a :href="meta.cv" download :aria-label="t('nav.cvLabel')">
            {{ t("nav.cv") }}
            <Icon name="tm:download-loop" size="1.5rem" />
        </a>
    </UiButton>
</template>
