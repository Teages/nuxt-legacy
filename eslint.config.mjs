// @ts-check
import antfu from '@antfu/eslint-config'
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    standalone: false,
  },
  dirs: {
    src: [
      './playgrounds/v4',
      './playgrounds/v4-env',
    ],
  },
})
  .append(
    antfu({
      rules: {
        curly: ['error', 'all'],
      },
    }),
    {
      files: ['pnpm-workspace.yaml'],
      rules: {
        // Renovate writes double-quoted entries (e.g. minimumReleaseAgeExclude)
        // into this file; do not enforce a quote style on it.
        'yaml/quotes': 'off',
      },
    },
  )
