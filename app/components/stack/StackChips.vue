<script setup lang="ts">
/** Mobile stack: the same nodes as chips, grouped into their three bands. */
import { STACK_GROUPS, STACK_NODES } from "~/data/stack";

defineProps<{ related: Set<string> }>();
const selected = defineModel<string>({ required: true });
const { t } = useI18n();

const bands = STACK_GROUPS.map(group => ({ group, nodes: STACK_NODES.filter(n => n.group === group) }));

function select(id: unknown) {
    if (typeof id === "string" && id) selected.value = id;
}
</script>

<template>
    <div class="flex flex-col gap-5">
        <div v-for="b in bands" :key="b.group" class="flex flex-col gap-2.5">
            <span :id="`stack-band-${b.group}`" class="eyebrow text-faint">{{ t(`stack.groups.${b.group}`) }}</span>
            <UiToggleGroup
                type="single"
                variant="node"
                size="lg"
                :spacing="2"
                :model-value="selected"
                :aria-labelledby="`stack-band-${b.group}`"
                class="flex-wrap"
                @update:model-value="select"
            >
                <UiToggleGroupItem
                    v-for="n in b.nodes"
                    :key="n.id"
                    :value="n.id"
                    :data-related="related.has(n.id) || undefined"
                    class="group/node gap-2"
                >
                    <StackDot />{{ n.label }}
                </UiToggleGroupItem>
            </UiToggleGroup>
        </div>
    </div>
</template>
