<script setup lang="ts">
/**
 * "Read more" disclosure. Native <details>, so it works without JS; it
 * animates open where the platform can transition to `height: auto`.
 */
defineProps<{ summaryLabel: string; body: string; highlights: string[] }>();
const { t } = useI18n();
</script>

<template>
    <details class="xp group/d mt-2 border-y border-hairline">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-4 py-4">
            <span class="eyebrow text-subtle transition-colors group-hover/d:text-foreground">
                <span class="group-open/d:hidden">{{ t("experience.more") }}</span>
                <span class="hidden group-open/d:inline">{{ t("experience.less") }}</span>
                <span class="sr-only"> — {{ summaryLabel }}</span>
            </span>
            <span
                aria-hidden="true"
                class="grid size-8 place-items-center rounded-full border border-hairline-strong text-[10px] text-gold transition-transform duration-500 ease-out-expo group-open/d:rotate-45"
            >
                <Icon name="tm:plus" />
            </span>
        </summary>
        <div class="flex flex-col gap-6 pb-7">
            <p class="text-[15px] leading-relaxed md:text-[17px]">{{ body }}</p>
            <div v-if="highlights.length">
                <span class="eyebrow text-faint">{{ t("experience.highlights") }}</span>
                <ul class="mt-3 flex flex-col gap-3">
                    <li
                        v-for="(h, i) in highlights"
                        :key="i"
                        class="flex gap-3 text-[15px] leading-relaxed text-subtle md:text-base"
                    >
                        <span aria-hidden="true" class="mt-[0.8em] h-px w-3 shrink-0 bg-gold" />
                        <span>{{ h }}</span>
                    </li>
                </ul>
            </div>
        </div>
    </details>
</template>

<style scoped>
.xp summary::-webkit-details-marker {
    display: none;
}

/* Animate the disclosure where the platform can size to `auto`. */
@supports (interpolate-size: allow-keywords) {
    .xp {
        interpolate-size: allow-keywords;
    }
    .xp::details-content {
        height: 0;
        overflow: clip;
        transition:
            height 0.5s var(--ease-out-expo),
            content-visibility 0.5s allow-discrete;
    }
    .xp[open]::details-content {
        height: auto;
    }
}

@media (prefers-reduced-motion: reduce) {
    .xp::details-content {
        transition: none;
    }
}
</style>
