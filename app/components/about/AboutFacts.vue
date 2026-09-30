<script setup lang="ts">
/** Short labelled facts (`about.meta.<key>` / `<key>V`), shared by the home section and /about. */
defineProps<{ keys: readonly ("basedIn" | "focus" | "primary" | "also" | "languages")[] }>();
const { t } = useI18n();
</script>

<template>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-10">
        <div v-for="k in keys" :key="k" class="border-t border-hairline-strong pt-3.5">
            <dt class="eyebrow text-subtle">{{ t(`about.meta.${k}`) }}</dt>
            <dd class="mt-2.5 font-display text-lg tracking-[-0.01em] md:text-2xl">
                {{ t(`about.meta.${k}V`) }}
            </dd>
        </div>
    </dl>
</template>
