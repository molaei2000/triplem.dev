<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{ content: string, items?: DropdownMenuItem[] }>()
const emit = defineEmits<{ (e: 'click', val: string, ev: MouseEvent): void }>()
const clipboard = useClipboard()
const copied = shallowRef(false)
function onClick(event: MouseEvent) {
  emit('click', props.content, event)
  clipboard.copy(props.content)
  copied.value = true
  setTimeout(() => {
    return (copied.value = false)
  }, 1500)
}
</script>

<template>
  <u-field-group class="w-full">
    <u-input :model-value="content" aria-label="Copy text" readonly class="w-full" />
    <u-button
      type="button"
      variant="subtle"
      :color="copied ? 'success' : 'neutral'"
      size="sm"
      aria-label="copy content"
      :icon="copied ? 'material-symbols:check-circle-rounded' : 'material-symbols:content-copy-outline-rounded'"
      @click="onClick"
    />
    <u-dropdown-menu v-if="(items?.length ?? 0) > 0" :items="props.items ?? []">
      <u-button color="neutral" variant="subtle" icon="i-lucide-chevron-down" size="sm" />
    </u-dropdown-menu>
  </u-field-group>
</template>

<style lang="css" scoped>
@reference "~/assets/css/main.css";
</style>
