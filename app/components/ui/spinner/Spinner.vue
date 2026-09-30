<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

// Uses the local `tm` icon collection instead of @lucide/vue (see CLAUDE.md → Icons).
// Pass a translated `aria-label`; it overrides the default below.
const props = defineProps<{
    class?: HTMLAttributes["class"];
}>();
</script>

<template>
    <Icon
        name="tm:loader"
        role="status"
        aria-label="Loading"
        :class="cn('size-4 animate-spin', props.class)"
    />
</template>
