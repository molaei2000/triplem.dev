<script setup lang="ts">
/** Idea → Architecture → Experience. Step N lights up slash N of the mark. */
const { t } = useI18n();
const steps = [0, 1, 2] as const;
</script>

<template>
    <ol class="grid grid-cols-1 gap-y-10 md:grid-cols-3 md:gap-x-6">
        <li v-for="i in steps" :key="i">
            <SiteReveal
                :delay="i * 0.08"
                class="flex flex-col gap-3.5 border-t border-hairline-strong pt-7"
            >
                <SiteMark :size="48" :stroke="3.2" :accent="i" tone="ghost" />
                <span class="eyebrow text-gold">{{ t(`about.m.${i}.n`) }}</span>
                <h3 class="font-display text-[2.25rem] font-medium tracking-[-0.02em]">
                    {{ t(`about.m.${i}.t`) }}
                </h3>
                <p class="max-w-[340px] text-[17px] leading-relaxed text-subtle">
                    {{ t(`about.m.${i}.d`) }}
                </p>
            </SiteReveal>
        </li>
    </ol>
</template>
