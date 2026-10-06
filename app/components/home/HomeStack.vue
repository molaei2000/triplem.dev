<script setup lang="ts">
import { STACK_BY_ID, stackNeighbours, type StackId } from "~/data/stack";

const { t } = useI18n();
const selected = shallowRef<StackId>("nuxt");
const related = computed(() => stackNeighbours(selected.value));
const current = computed(() => STACK_BY_ID[selected.value]!);
</script>

<template>
    <SiteSection
        id="stack"
        :label="t('stack.label')"
        :caption="t('stack.caption')"
        coord="y · 2340"
    >
        <template #default="{ titleId }">
            <div class="mt-12 grid-12 items-start gap-y-10 md:mt-18">
                <div class="col-span-4 flex flex-col gap-5 md:col-span-3">
                    <h2
                        :id="titleId"
                        class="font-display text-[2.25rem] leading-[1.02] font-medium tracking-[-0.03em] md:text-[2.75rem]"
                    >
                        {{ t("stack.title") }}
                    </h2>
                    <p class="text-[17px] leading-relaxed text-subtle">{{ t("stack.intro") }}</p>
                </div>

                <StackGraph
                    v-model="selected"
                    :related="related"
                    class="col-span-6 col-start-4 hidden md:block"
                />
                <StackChips v-model="selected" :related="related" class="col-span-4 md:hidden" />
                <StackDetail
                    :node="current"
                    :related="related"
                    class="col-span-4 md:col-span-3 md:col-start-10"
                />
            </div>
        </template>
    </SiteSection>
</template>
