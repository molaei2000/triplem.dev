<script setup lang="ts">
import type { PaginationEllipsisProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { PaginationEllipsis } from "reka-ui";
import { cn } from "@/lib/utils";

// Brand: a plain ellipsis in the faint label type instead of upstream's lucide icon.
const props = defineProps<PaginationEllipsisProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <PaginationEllipsis
        data-slot="pagination-ellipsis"
        v-bind="delegatedProps"
        :class="cn('eyebrow flex size-10 items-center justify-center text-faint', props.class)"
    >
        <slot>
            <span aria-hidden="true">…</span>
            <span class="sr-only">More pages</span>
        </slot>
    </PaginationEllipsis>
</template>
