<script lang="ts" setup>
const props = defineProps<{ src: string, name: string }>()
</script>

<template>
	<u-card id="author-about" variant="soft" class="mt-16">
		<template #header>
			<div class="flex flex-col gap-2">
				<p class="font-bold text-highlighted">
					About the author
				</p>
				<slot name="body" />
			</div>
		</template>
		<template #footer>
			<div class="flex items-center gap-2">
				<u-avatar :src="src" />
				<p class="typ-label">
					{{ name }}
				</p>
				<div class="ml-auto flex items-center gap-2 justify-end">
					<slot name="actions" />
				</div>
			</div>
		</template>
	</u-card>
</template>

<style lang="css" scoped>
@reference "~/assets/css/main.css";
</style>
