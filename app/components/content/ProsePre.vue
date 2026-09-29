<script setup lang="ts">
/** Fenced code in blog posts: a filename/language bar, copy button, and a block that stays dark in both themes. */
const props = withDefaults(defineProps<{
    code?: string;
    language?: string | null;
    filename?: string | null;
    highlights?: number[];
    meta?: string | null;
    class?: string | null;
    style?: string | Record<string, string> | null;
}>(), { code: "", language: null, filename: null, highlights: () => [], meta: null, class: null, style: null });

const { t } = useI18n();
const { copy, copied } = useClipboard({ legacy: true, copiedDuring: 1600 });
</script>

<template>
    <figure class="code-block" dir="ltr">
        <div class="flex items-center justify-between gap-4 border-b border-white/8 px-4.5 py-3">
            <span class="font-mono text-[11px] font-medium tracking-[0.06em] text-[#A6A298]">{{ props.filename || props.language || "code" }}</span>
            <button
                type="button"
                class="font-mono text-[11px] font-medium tracking-[0.1em] text-[#A6A298] uppercase transition-colors hover:text-[#F2EFE8]"
                @click="copy(props.code)"
            >
                {{ copied ? t("blog.copiedCode") : t("blog.copyCode") }}
            </button>
        </div>
        <pre :class="props.class" :style="props.style ?? undefined"><slot /></pre>
    </figure>
</template>
