<script lang="ts" setup>
defineProps<{ model: string }>()
</script>

<template>
  <PageIndexTModel model="/packaging/packaging.gltf" :map="`/textures/${model}-packaging-min.jpg`" v-bind="$attrs" />
</template>
