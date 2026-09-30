<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
    <div id="top" class="relative isolate min-h-dvh overflow-x-clip">
        <a
            href="#main"
            class="sr-only z-[60] rounded-lg bg-gold px-4 py-2 text-on-gold focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
            >{{ t("nav.skip") }}</a
        >
        <div aria-hidden="true" class="tech-grid pointer-events-none fixed inset-0 -z-10" />
        <div aria-hidden="true" class="grain pointer-events-none fixed inset-0 -z-10" />
        <SiteNav />
        <main id="main">
            <slot />
        </main>
        <SiteFooter />
    </div>
</template>
