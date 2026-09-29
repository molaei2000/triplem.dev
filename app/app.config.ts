export default defineAppConfig({
    icon: {
        mode: "css",
        // Tailwind v4 utilities must be able to override icon sizing.
        cssLayer: "base",
    },
});
