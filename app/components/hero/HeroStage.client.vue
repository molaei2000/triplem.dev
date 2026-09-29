<script setup lang="ts">
/**
 * DOM side of the 3D hero: owns the canvas, translates pointer/touch into the
 * shared input bag, pauses rendering off-screen, and falls back to the static
 * mark when WebGL is unavailable. The scene itself is decorative (aria-hidden);
 * the readout and buttons in HomeHero carry the meaning for assistive tech.
 */
import { TresCanvas } from "@tresjs/core";
import { ACESFilmicToneMapping } from "three";
import { createSlashInput } from "~/lib/slash-input";

const props = defineProps<{ split: boolean; selected: number; distance?: number }>();
const emit = defineEmits<{ hover: [index: number]; tap: [index: number] }>();

const { isDark } = useTheme();
const reducedPref = usePreferredReducedMotion();
const reduced = computed(() => reducedPref.value === "reduce");

const el = useTemplateRef<HTMLElement>("el");
const visible = useElementVisibility(el);
const input = createSlashInput(props.distance ?? 9);
input.touch = import.meta.client && matchMedia("(pointer: coarse)").matches;

watchEffect(() => {
    input.split = props.split;
    input.selected = props.selected;
});

const webgl = shallowRef(true);
onMounted(() => {
    const c = document.createElement("canvas");
    webgl.value = !!(c.getContext("webgl2") || c.getContext("webgl"));
});

let rect: DOMRect | undefined;
let lastX = 0;
let lastY = 0;
let moved = 0;

function toNdc(e: PointerEvent) {
    rect ??= el.value!.getBoundingClientRect();
    input.px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    input.py = ((e.clientY - rect.top) / rect.height) * 2 - 1;
}
function onEnter() {
    rect = el.value!.getBoundingClientRect();
    input.inside = true;
}
function onLeave() {
    input.inside = false;
    input.px = 0;
    input.py = 0;
    input.pick = true;
}
function onDown(e: PointerEvent) {
    rect = el.value!.getBoundingClientRect();
    toNdc(e);
    input.dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    moved = 0;
    if (e.pointerType === "mouse") (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function onMove(e: PointerEvent) {
    toNdc(e);
    input.inside = true;
    if (input.dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        input.dragYaw += dx * 0.012;
        input.velocity = dx * 0.012;
        if (e.pointerType === "mouse") input.dragPitch = Math.max(-0.5, Math.min(0.5, input.dragPitch + dy * 0.006));
    }
    else if (e.pointerType === "mouse") {
        input.pick = true;
    }
}
function onUp(e: PointerEvent) {
    if (!input.dragging) return;
    input.dragging = false;
    if (moved < 6) {
        // a click/tap: pick on the next frame, then report it
        toNdc(e);
        input.inside = true;
        input.pick = true;
        input.tap = true;
    }
    if (e.pointerType !== "mouse") {
        input.px = 0;
        input.py = 0;
    }
}
function onCancel() {
    input.dragging = false;
}

function onHover(i: number, tap: boolean) {
    emit("hover", i);
    if (tap) emit("tap", i);
}

useResizeObserver(el, () => (rect = undefined));

defineExpose({
    reset() {
        input.dragYaw = 0;
        input.dragPitch = 0;
        input.velocity = 0;
    },
});
</script>

<template>
    <div
        ref="el"
        class="relative size-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
        @pointerenter="onEnter"
        @pointerleave="onLeave"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onCancel"
    >
        <TresCanvas
            v-if="webgl"
            alpha
            :clear-alpha="0"
            :dpr="[1, 2]"
            :tone-mapping="ACESFilmicToneMapping"
            :tone-mapping-exposure="1"
            power-preference="high-performance"
        >
            <HeroSlashScene :input="input" :dark="isDark" :reduced="reduced" :active="visible" @hover="onHover" />
        </TresCanvas>
        <div v-else class="grid size-full place-items-center">
            <SiteMark :size="240" />
        </div>
    </div>
</template>
