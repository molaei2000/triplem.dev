<script setup lang="ts">
/**
 * Staggered, once-only reveal on scroll. Respects reduced motion via <MotionConfig>.
 *
 * `immediate` is for content that is on screen when the page loads: the same entrance, run as a
 * CSS animation from the first paint. The scroll reveal is driven by JS, so its content stays
 * hidden until hydration and cannot count as the page's largest paint before then.
 */
import { motion } from "motion-v";

withDefaults(defineProps<{ delay?: number; y?: number; immediate?: boolean }>(), {
    delay: 0,
    y: 24,
});
</script>

<template>
    <div
        v-if="immediate"
        class="reveal-in"
        :style="{ '--reveal-y': `${y}px`, '--reveal-delay': `${delay}s` }"
    >
        <slot />
    </div>
    <motion.div
        v-else
        :initial="{ opacity: 0, y }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :in-view-options="{ once: true, margin: '0px 0px -10% 0px' }"
        :transition="{ duration: 0.8, delay, ease: [0.2, 0.7, 0.1, 1] }"
    >
        <slot />
    </motion.div>
</template>

<style scoped>
/* Same values as the scroll reveal above: 0.8s, --ease-out-expo is cubic-bezier(0.2, 0.7, 0.1, 1).
   `both`, not `backwards`: when the animation lets go at its end the browser repaints the
   content, and Chrome then times the largest paint at the end of the fade instead of the first
   frame. The price is an identity transform, and so a stacking context, left on the wrapper. */
.reveal-in {
    animation: reveal-in 0.8s var(--ease-out-expo) var(--reveal-delay) both;
}

@keyframes reveal-in {
    from {
        opacity: 0;
        transform: translateY(var(--reveal-y));
    }
}

@media (prefers-reduced-motion: reduce) {
    .reveal-in {
        animation: none;
    }
}
</style>
