<script setup lang="ts">
/** The Stack graph's nodes, grouped by layer, as a plain list. */
import { STACK_GROUPS, STACK_NODES } from "~/data/stack";

const { t } = useI18n();
const groups = STACK_GROUPS.map(g => ({ id: g, nodes: STACK_NODES.filter(n => n.group === g) }));
</script>

<template>
    <div class="grid grid-cols-1 gap-y-10 md:grid-cols-3 md:gap-x-6">
        <div v-for="g in groups" :key="g.id">
            <h3 class="eyebrow border-b border-hairline-strong pb-3.5 text-gold">{{ t(`stack.groups.${g.id}`) }}</h3>
            <ul>
                <li
                    v-for="n in g.nodes"
                    :key="n.id"
                    class="flex items-center justify-between gap-3 border-b border-hairline py-4 font-display text-xl tracking-[-0.01em] md:text-2xl"
                >
                    {{ n.label }}
                    <UiBadge v-if="n.primary" variant="gold">{{ t("about.meta.primary") }}</UiBadge>
                </li>
            </ul>
        </div>
    </div>
</template>
