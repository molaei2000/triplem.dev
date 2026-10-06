<script setup lang="ts">
/** The spec-driven loop: stages as vertical tabs, each showing the file it produces. */
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { AI_STAGES, type AiStageId } from "~/data/ai";

const { t } = useI18n();
const stage = shallowRef<AiStageId>("specify");
const touched = shallowRef(false);

function select(id: unknown) {
    if (!AI_STAGES.some((s) => s.id === id)) return;
    stage.value = id as AiStageId;
    touched.value = true;
}
</script>

<template>
    <TabsRoot
        :model-value="stage"
        orientation="vertical"
        class="grid-12 gap-y-8"
        @update:model-value="select"
    >
        <TabsList
            :aria-label="t('ai.loop.label')"
            class="col-span-4 flex flex-col self-start md:col-span-3"
        >
            <TabsTrigger
                v-for="s in AI_STAGES"
                :key="s.id"
                :value="s.id"
                class="group/stage flex items-baseline gap-4 border-s-2 border-hairline-strong py-3 ps-5 text-start text-subtle transition-colors duration-300 hover:text-foreground data-[state=active]:border-gold data-[state=active]:text-foreground md:py-4"
            >
                <span
                    class="eyebrow w-5 shrink-0 text-faint group-data-[state=active]/stage:text-gold"
                    >{{ t(`ai.stages.${s.id}.n`) }}</span
                >
                <span
                    class="font-display text-[1.625rem] leading-none font-medium tracking-[-0.02em] md:text-[2rem]"
                    >{{ t(`ai.stages.${s.id}.t`) }}</span
                >
            </TabsTrigger>
        </TabsList>

        <TabsContent
            v-for="s in AI_STAGES"
            :key="s.id"
            :value="s.id"
            class="col-span-4 md:col-span-8 md:col-start-5"
        >
            <AiArtifact :stage="s" :animate="touched" />
        </TabsContent>
    </TabsRoot>
</template>
