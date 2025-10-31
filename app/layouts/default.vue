<script lang="ts" setup>
import type { NavigationMenuItem } from "@nuxt/ui"
import appMeta from "~/app.meta"

const navItems: NavigationMenuItem[] = [
	{ label: "YouTube channel", icon: "logos:youtube-icon", target: "_blank", to: "https://www.youtube.com/@matteo-beltrame" },
	{ label: "Repository", icon: "mdi:github", target: "_blank", to: "https://github.com/tratteo/nuxt_template" },
]
</script>

<template>
	<div>
		<u-header mode="slideover">
			<template #left>
				<u-user name="Nuxt template" to="/" :avatar="{ src: 'https://tratteo.it/favicon.svg' }" />
			</template>
			<template #right>
				<ColorModeButton />
			</template>
			<u-navigation-menu :items="navItems" />
			<template #body>
				<u-navigation-menu :items="navItems" />
			</template>
		</u-header>
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
					<u-user name="Created by Matteo Beltrame" :avatar="{ src: 'https://tratteo.it/favicon.svg' }" />
					<CopyableText class="h-8 text-nowrap" :content="appMeta.author.email" />
				</div>
			</template>
		</u-footer>
	</div>
</template>

<style></style>
