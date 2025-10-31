<script lang="ts" setup>
export type AlertType = "warning" | "info" | "error" | "success"
const props = withDefaults(defineProps<{ type?: AlertType, title?: string, description?: string }>(), { type: "info" })
const getIconName = computed(() => {
	switch (props.type) {
		case "error":
			return "ph:minus-circle-fill"
		case "warning":
			return "material-symbols:warning-rounded"
		case "info":
			return "material-symbols:info-rounded"
		case "success":
			return "material-symbols:check-circle-rounded"
	}
})
const getColorName = computed(() => {
	switch (props.type) {
		case "error":
			return "error"
		case "warning":
			return "warning"
		case "info":
			return "info"
		case "success":
			return "success"
	}
})
</script>

<template>
	<u-alert :title="title" :description="description" variant="subtle" :color="getColorName" :icon="getIconName" class="alert">
		<template v-if="$slots.title" #title>
			<slot name="title" />
		</template>
		<template v-if="$slots.description" #description>
			<slot name="description" />
		</template>
	</u-alert>
</template>

<style lang="css">
@reference "~/assets/css/main.css";
</style>
