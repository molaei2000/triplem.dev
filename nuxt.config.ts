import { definePerson } from "nuxt-schema-org/schema"
import appMeta from "./app/app.meta"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },
	app: {
		head: {
			meta: [{ name: "apple-mobile-web-app-title", content: "TripleM" }],
			link: [
				{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			],
		},
	},
	css: ["~/assets/css/main.css"],
	fonts: {
		defaults: {
			weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
		},
	},
	site: {
		name: appMeta.name,
		url: appMeta.url,
		defaultLocale: "en",
	},
	schemaOrg: {
		identity: definePerson(appMeta.author),
	},
	content: {
		build: {
			markdown: {
				toc: {
					depth: 3,
					searchDepth: 2,
				},
				remarkPlugins: {
					"remark-reading-time": {},
				},
			},
		},
	},
	modules: ["@nuxt/ui", "motion-v/nuxt", "@nuxt/content", "@nuxtjs/seo", "@vueuse/nuxt", "nuxt-schema-org"],
})
