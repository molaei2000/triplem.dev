<script setup lang="ts">
/** A screenshot in minimal browser chrome. Purely presentational. */
import type { ExperienceShot } from "~/data/experience";

defineProps<{ shot: ExperienceShot; alt: string; host: string; sizes: string; compact?: boolean }>();
</script>

<template>
    <figure class="overflow-hidden rounded-lg border border-hairline-strong bg-elevated shadow-(--shadow-lift)">
        <div
            aria-hidden="true"
            class="flex items-center gap-1.5 border-b border-hairline px-3"
            :class="compact ? 'h-6 md:h-7' : 'h-8 md:h-9 md:px-4'"
        >
            <span v-for="d in 3" :key="d" class="size-1.5 rounded-full bg-hairline-strong md:size-2" />
            <span
                v-if="!compact"
                class="ms-3 truncate rounded-full border border-hairline px-3 py-0.5 font-mono text-[10px] tracking-[0.06em] text-subtle md:ms-4"
            >{{ host }}</span>
        </div>
        <NuxtImg
            :src="shot.src"
            :width="shot.width"
            :height="shot.height"
            :sizes="sizes"
            :alt="alt"
            format="webp"
            loading="lazy"
            decoding="async"
            class="block h-auto w-full"
        />
    </figure>
</template>
