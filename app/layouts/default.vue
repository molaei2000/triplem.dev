<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
    <div id="top" class="relative isolate min-h-dvh overflow-x-clip">
        <a
            href="#main"
            class="sr-only z-[60] rounded-lg bg-gold px-4 py-2 text-on-gold focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        >{{ t("nav.skip") }}</a>
        <div aria-hidden="true" class="tech-grid pointer-events-none fixed inset-0 -z-10" />
        <div aria-hidden="true" class="grain pointer-events-none fixed inset-0 -z-10" />
        <SiteNav />
        <main id="main">
            <slot />
        </main>
        <SiteFooter />
    </div>
</template>

<style scoped>
.grain {
    opacity: 0.07;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
:global(html:not(.dark)) .grain {
    opacity: 0.045;
    mix-blend-mode: multiply;
}
</style>
