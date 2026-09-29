<script setup lang="ts">
/** Desktop stack: nodes on a connected graph, one selected at a time (roving focus via ToggleGroup). */
import { STACK_BOX, STACK_BY_ID, STACK_EDGES, STACK_NODES } from "~/data/stack";

defineProps<{ related: Set<string> }>();
const selected = defineModel<string>({ required: true });

const { t, localeProperties } = useI18n();
const rtl = computed(() => localeProperties.value.dir === "rtl");
const { width: W, height: H } = STACK_BOX;
const px = (x: number) => (rtl.value ? W - x : x);

const edges = computed(() => STACK_EDGES.map(([a, b]) => {
    const from = STACK_BY_ID[a]!;
    const to = STACK_BY_ID[b]!;
    return { key: `${a}-${b}`, x1: px(from.x), y1: from.y, x2: px(to.x), y2: to.y, lit: a === selected.value || b === selected.value };
}));

/** ToggleGroup emits `undefined` when the active item is pressed again; keep the selection instead. */
function select(id: unknown) {
    if (typeof id === "string" && id) selected.value = id;
}
</script>

<template>
    <UiToggleGroup
        type="single"
        variant="node"
        size="lg"
        :spacing="2"
        :model-value="selected"
        :aria-label="t('stack.title')"
        class="relative block aspect-[628/520] w-auto"
        @update:model-value="select"
    >
        <UiSeparator class="absolute inset-x-0 top-[39.4%] border-t border-dashed border-hairline bg-transparent" />
        <UiSeparator class="absolute inset-x-0 top-[72.1%] border-t border-dashed border-hairline bg-transparent" />
        <span class="eyebrow absolute start-0 top-0 text-faint">{{ t("stack.groups.language") }}</span>
        <span class="eyebrow absolute start-0 top-[41.7%] text-faint">{{ t("stack.groups.framework") }}</span>
        <span class="eyebrow absolute start-0 top-[74.4%] text-faint">{{ t("stack.groups.craft") }}</span>

        <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="absolute inset-0 size-full" aria-hidden="true">
            <line
                v-for="e in edges"
                :key="e.key"
                :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2"
                vector-effect="non-scaling-stroke"
                :stroke="e.lit ? 'var(--gold-line)' : 'var(--hairline-strong)'"
                class="transition-[stroke] duration-300"
            />
        </svg>

        <UiToggleGroupItem
            v-for="n in STACK_NODES"
            :key="n.id"
            :value="n.id"
            :data-related="related.has(n.id) || undefined"
            class="group/node absolute -translate-x-1/2 -translate-y-1/2 gap-2.5 px-4"
            :style="{ left: `${(px(n.x) / W) * 100}%`, top: `${(n.y / H) * 100}%` }"
            @mouseenter="selected = n.id"
            @focus="selected = n.id"
        >
            <StackDot />{{ n.label }}
        </UiToggleGroupItem>
    </UiToggleGroup>
</template>
