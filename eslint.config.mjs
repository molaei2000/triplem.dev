// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Vendored agent skills are third-party code, not part of the site.
  { ignores: ['.agents/**', '.claude/**'] },
  // shadcn-vue components are generated; keep them close to upstream so `shadcn-vue add` diffs stay small.
  {
    files: ['app/components/ui/**/*.vue'],
    rules: { 'vue/require-default-prop': 'off' },
  },
)
