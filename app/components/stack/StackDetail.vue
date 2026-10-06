<script setup lang="ts">
/** Live description of the selected stack node. */
import { experience } from "~/data/experience";
import type { StackNode } from "~/data/stack";
import { STACK_NODES } from "~/data/stack";

const props = defineProps<{ node: StackNode; related: Set<string> }>();
const { t } = useI18n();

const kicker = computed(() =>
    props.node.primary ? t("stack.groups.primary") : t(`stack.groups.${props.node.group}`),
);
const relatedLabels = computed(() =>
    STACK_NODES.filter((n) => props.related.has(n.id))
        .map((n) => n.label)
        .join(" · "),
);
const shippedInExperience = computed(() =>
    experience
        .filter((e) => e.stack?.map((s) => s).includes(props.node.id))
        .map((e) => e.id)
        .join(" · "),
);
const rows = computed(() => [
    { key: "connects", label: t("stack.connects"), value: relatedLabels.value, muted: false },
    { key: "shipped", label: t("stack.shipped"), value: shippedInExperience.value, muted: true },
]);
</script>

<template>
    <aside
        aria-live="polite"
        class="flex flex-col gap-4.5 rounded-lg border border-hairline-strong bg-surface p-6 md:p-7"
    >
        <span class="eyebrow text-gold">{{ kicker }}</span>
        <h3 class="font-display text-[2.5rem] leading-none font-medium tracking-[-0.03em]">
            {{ node.label }}
        </h3>
        <p class="leading-relaxed text-subtle">{{ t(`stack.d.${node.id}`) }}</p>

        <div
            v-for="r in rows"
            :key="r.key"
            class="flex flex-col gap-2 border-t border-hairline pt-4"
        >
            <span class="eyebrow text-faint">{{ r.label }}</span>
            <span class="text-[15px]" :class="r.muted && 'text-subtle'">{{ r.value }}</span>
        </div>
    </aside>
</template>
