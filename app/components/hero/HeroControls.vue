<script setup lang="ts">
/** Decompose/assemble toggle and reset for the 3D mark. */
const split = defineModel<boolean>("split", { required: true });
const emit = defineEmits<{ reset: [] }>();
const { t } = useI18n();
</script>

<template>
    <div class="flex gap-2">
        <UiToggle v-model="split" variant="outline" size="label" class="grow md:grow-0">
            {{ split ? t("hero.assemble") : t("hero.decompose") }}
        </UiToggle>
        <UiButton variant="outline" size="label" @click="emit('reset')">
            {{ t("hero.reset") }}
        </UiButton>
    </div>
</template>
