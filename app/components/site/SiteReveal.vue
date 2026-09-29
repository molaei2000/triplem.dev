<script setup lang="ts">
/** Staggered, once-only reveal on scroll. Respects reduced motion via <MotionConfig>. */
import { motion } from "motion-v";

withDefaults(defineProps<{ delay?: number; y?: number }>(), { delay: 0, y: 24 });
</script>

<template>
    <motion.div
        :initial="{ opacity: 0, y }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :in-view-options="{ once: true, margin: '0px 0px -10% 0px' }"
        :transition="{ duration: 0.8, delay, ease: [0.2, 0.7, 0.1, 1] }"
    >
        <slot />
    </motion.div>
</template>
