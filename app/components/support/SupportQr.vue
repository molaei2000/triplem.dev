<script setup lang="ts">
/**
 * A QR code drawn as a single SVG path (uqr), one subpath per run of dark modules. It is always
 * dark on a light tile, whatever the theme, because many scanners can't read inverted codes.
 * The encoded border is the quiet zone.
 */
import { encode } from "uqr";

const props = defineProps<{ value: string; label: string }>();

const qr = computed(() => {
    const { size, data } = encode(props.value, { ecc: "M", border: 3 });
    let d = "";
    data.forEach((row, y) => {
        for (let x = 0; x < size; x++) {
            if (!row[x]) continue;
            const start = x;
            while (x + 1 < size && row[x + 1]) x++;
            d += `M${start} ${y}h${x + 1 - start}v1h${start - x - 1}z`;
        }
    });
    return { size, d };
});
</script>

<template>
    <!-- Fixed light-theme colours on purpose: see above. -->
    <div class="aspect-square overflow-hidden rounded-md bg-[#fbf8f2] text-[#1b1a17]">
        <svg
            :viewBox="`0 0 ${qr.size} ${qr.size}`"
            role="img"
            :aria-label="label"
            shape-rendering="crispEdges"
            class="block size-full"
        >
            <path :d="qr.d" fill="currentColor" />
        </svg>
    </div>
</template>
