<script setup lang="ts">
/** Search box + topic filter for the blog index. */
defineProps<{ tags: string[] }>();
const query = defineModel<string>("query", { required: true });
const tag = defineModel<string | null>("tag", { required: true });
const { t } = useI18n();

const ALL = "*";
const tagValue = computed({
    get: () => tag.value ?? ALL,
    // Pressing the active topic again deselects it (`undefined`): fall back to "all".
    set: (v: unknown) => (tag.value = typeof v === "string" && v !== ALL ? v : null),
});
</script>

<template>
    <div class="grid-12 items-center gap-y-4">
        <UiInputGroup class="col-span-4 h-12 rounded-lg bg-transparent dark:bg-transparent">
            <UiInputGroupAddon class="ps-4 text-subtle">
                <Icon name="tm:search" class="size-4.5" />
            </UiInputGroupAddon>
            <label for="blog-search" class="sr-only">{{ t("blog.search") }}</label>
            <UiInputGroupInput
                id="blog-search"
                v-model="query"
                type="search"
                :placeholder="t('blog.searchPlaceholder')"
                class="h-full text-[15px] placeholder:text-faint md:text-[15px]"
            />
        </UiInputGroup>
        <UiToggleGroup
            v-if="tags.length > 1"
            v-model="tagValue"
            type="single"
            variant="chip"
            size="chip"
            :spacing="2"
            :aria-label="t('blog.filter')"
            class="col-span-4 w-auto flex-wrap md:col-span-8 md:justify-end"
        >
            <UiToggleGroupItem :value="ALL">{{ t("blog.allTags") }}</UiToggleGroupItem>
            <UiToggleGroupItem v-for="x in tags" :key="x" :value="x">{{ x }}</UiToggleGroupItem>
        </UiToggleGroup>
    </div>
</template>
