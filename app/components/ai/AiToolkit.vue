<script setup lang="ts">
/** The five AI tools, what each one is for, and where it sits in the loop. */
import { AI_TOOLS, aiToolStages } from "~/data/ai";

const { t } = useI18n();
const tools = computed(() =>
    AI_TOOLS.map((tool) => ({
        ...tool,
        stages: aiToolStages(tool.id)
            .map((s) => t(`ai.stages.${s}.t`))
            .join(" · "),
    })),
);
</script>

<template>
    <ul class="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 md:grid-cols-5">
        <li
            v-for="tool in tools"
            :key="tool.id"
            class="grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-2.5 border-t border-hairline-strong pt-6 pb-8 md:flex md:flex-col md:gap-3.5"
        >
            <Icon :name="`tm:${tool.icon}`" class="row-span-3 size-8 md:mb-2" />
            <h3
                class="latin-display font-display text-[1.375rem] leading-tight font-medium tracking-[-0.015em]"
            >
                {{ tool.label }}
            </h3>
            <p class="text-[15px] leading-relaxed text-subtle">{{ t(`ai.tools.${tool.id}`) }}</p>
            <p class="eyebrow text-faint md:mt-auto md:pt-2">
                {{ t("ai.usedIn") }} <span class="text-subtle">{{ tool.stages }}</span>
            </p>
        </li>
    </ul>
</template>
