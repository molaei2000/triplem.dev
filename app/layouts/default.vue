<script lang="ts" setup>
import appMeta from "~/app.meta"
</script>

<template>
	<div>
		<AppHeader />
		<u-main>
			<NuxtPage />
		</u-main>
		<u-footer class="border-t border-t-default">
			<template #bottom>
				<u-container>
					<u-footer-columns />
				</u-container>
			</template>
			<template #left>
				<div class="flex flex-col items-stretch gap-4">
					<u-user name="Created by Triple M" />
					<CopyableText class="h-8 text-nowrap" :content="appMeta.author.email" />
				</div>
			</template>
		</u-footer>
	</div>
</template>

<style></style>
