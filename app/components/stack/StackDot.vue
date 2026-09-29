<script setup lang="ts">
/** State dot inside a stack node; follows the parent item's `data-state` / `data-related`. */
</script>

<template>
    <span
        aria-hidden="true"
        class="size-1.5 rounded-full bg-faint group-data-[related]/node:bg-gold group-data-[state=on]/node:bg-on-gold"
    />
</template>
