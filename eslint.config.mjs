// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Vendored agent skills are third-party code, not part of the site.
  { ignores: ['.agents/**', '.claude/**'] },
)
