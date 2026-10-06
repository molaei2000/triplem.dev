<script setup lang="ts">
/** The two ways I build with AI: vibe coding to explore, spec-driven development to ship. */
const { t } = useI18n();
const modes = ["vibe", "spec"] as const;
</script>

<template>
    <ul class="grid grid-cols-1 gap-y-10 md:grid-cols-2 md:gap-x-6">
        <li v-for="(m, i) in modes" :key="m">
            <SiteReveal
                :delay="i * 0.08"
                class="flex flex-col gap-3.5 border-t border-hairline-strong pt-7 md:max-w-[520px]"
            >
                <span class="eyebrow" :class="m === 'spec' ? 'text-gold' : 'text-faint'">{{
                    t(`ai.modes.${m}.k`)
                }}</span>
                <h3
                    class="font-display text-[1.875rem] leading-[1.05] font-medium tracking-[-0.02em] md:text-[2.25rem]"
                >
                    {{ t(`ai.modes.${m}.t`) }}
                </h3>
                <p class="text-[17px] leading-relaxed text-subtle">{{ t(`ai.modes.${m}.d`) }}</p>
            </SiteReveal>
        </li>
    </ul>
</template>
