<script lang="ts" setup>
const { isDark, colorMode } = useDark()
</script>

<template>
  <ClientOnly v-if="!colorMode?.forced">
    <u-switch v-model="isDark" checked-icon="i-lucide-moon" unchecked-icon="i-lucide-sun" color="neutral" size="sm" />
    <template #fallback>
      <div class="size-8" />
    </template>
  </ClientOnly>
</template>
