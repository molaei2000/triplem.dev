<script setup lang="ts">
/**
 * One stage of the loop: what happens, then the file it produces in an editor
 * window that stays dark in both themes (like blog code blocks).
 */
import { AI_STAGES, AI_TOOL_BY_ID, parseAiLine, type AiLineKind, type AiStage } from "~/data/ai";

const props = defineProps<{
    stage: AiStage;
    /** Type the lines in; off until the visitor picks a stage, so first paint is static. */
    animate?: boolean;
}>();
const { t } = useI18n();

const lines = computed(() => props.stage.lines.map(parseAiLine));
const tools = computed(() => props.stage.tools.map((id) => AI_TOOL_BY_ID[id]));

/** Files opened so far in the loop; the spec stays open the whole way. */
const files = computed(() => {
    const index = AI_STAGES.findIndex((s) => s.id === props.stage.id);
    return [...new Set(AI_STAGES.slice(0, index + 1).map((s) => s.file))];
});

const MARK: Record<AiLineKind, string> = {
    heading: "text-[#C8A45C]/70",
    done: "text-[#C8A45C]",
    todo: "text-[#6F6B63]",
    add: "text-[#C8A45C]",
    ok: "text-[#C8A45C]",
    comment: "",
    text: "",
};
const BODY: Record<AiLineKind, string> = {
    heading: "font-medium text-[#F2EFE8]",
    done: "text-[#F2EFE8]",
    todo: "text-[#F2EFE8]/75",
    add: "text-[#F2EFE8]",
    ok: "text-[#A6A298]",
    comment: "text-[#6F6B63]",
    text: "text-[#F2EFE8]/75",
};
</script>

<template>
    <div class="flex flex-col gap-5">
        <p class="max-w-[560px] text-[17px] leading-relaxed md:min-h-[3.4em]">
            {{ t(`ai.stages.${stage.id}.d`) }}
        </p>

        <figure
            class="overflow-hidden rounded-lg border border-white/8 bg-[#141412] text-[#F2EFE8]"
        >
            <figcaption
                dir="ltr"
                class="flex items-stretch overflow-x-auto border-b border-white/8 font-mono text-[11px] tracking-[0.06em]"
            >
                <span
                    v-for="f in files"
                    :key="f"
                    class="items-center gap-2 border-e border-white/8 px-4 py-3"
                    :class="
                        f === stage.file
                            ? 'flex bg-white/4 text-[#F2EFE8]'
                            : 'hidden text-[#6F6B63] sm:flex'
                    "
                    :aria-hidden="f !== stage.file || undefined"
                >
                    <span
                        v-if="f === stage.file"
                        aria-hidden="true"
                        class="size-1.5 rounded-full bg-[#C8A45C]"
                    />
                    {{ f }}
                </span>
            </figcaption>

            <code
                dir="ltr"
                class="block py-4 font-mono text-[12.5px] leading-[1.85] md:min-h-[19.5rem] md:text-[13.5px]"
            >
                <span
                    v-for="(line, i) in lines"
                    :key="`${stage.id}-${i}`"
                    class="grid grid-cols-[2.75rem_1fr] pe-4"
                    :class="[animate && 'type-in', line.kind === 'add' && 'bg-[#C8A45C]/8']"
                    :style="{ '--i': i }"
                >
                    <span aria-hidden="true" class="pe-4 text-end text-[#6F6B63] select-none">{{
                        i + 1
                    }}</span>
                    <span
                        class="break-words whitespace-pre-wrap"
                        :style="{
                            paddingLeft: `${line.mark.length}ch`,
                            textIndent: `-${line.mark.length}ch`,
                        }"
                        ><span :class="MARK[line.kind]">{{ line.mark }}</span
                        ><span :class="BODY[line.kind]">{{ line.body }}</span></span
                    >
                </span>
            </code>

            <div
                class="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-white/8 px-4 py-3.5"
            >
                <span class="eyebrow text-[#A6A298]">{{ t("ai.loop.tools") }}</span>
                <span
                    v-for="tool in tools"
                    :key="tool.id"
                    class="inline-flex items-center gap-2 text-[13px] text-[#F2EFE8]"
                >
                    <Icon :name="`tm:${tool.icon}`" class="size-4" />
                    <span class="latin">{{ tool.label }}</span>
                </span>
            </div>
        </figure>
    </div>
</template>

<style scoped>
/* The file is written line by line, left to right, when the visitor changes stage. */
.type-in {
    animation: type-in 0.32s var(--ease-out-expo) both;
    animation-delay: calc(var(--i) * 32ms);
}

@keyframes type-in {
    from {
        clip-path: inset(0 100% 0 0);
        opacity: 0.4;
    }

    to {
        clip-path: inset(0 0 0 0);
        opacity: 1;
    }
}

@media (prefers-reduced-motion: reduce) {
    .type-in {
        animation: none;
    }
}
</style>
