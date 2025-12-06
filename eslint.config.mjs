// @ts-check
import antfu from '@antfu/eslint-config'
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    standalone: false,
  },
  dirs: {
    src: [
      './playground',
    ],
  },
})
  .append(
    antfu({
      rules: {
        curly: ['error', 'all'],
      },
    }),
  )
  .append({
    // v3 playground uses different Nuxt version incompatible with main catalog
    files: ['playgrounds/v3/package.json'],
    rules: {
      'pnpm/json-enforce-catalog': 'off',
    },
  })
  .append({
    // Disabled to avoid conflicts with trustPolicy settings that prevent installation
    files: ['pnpm-workspace.yaml'],
    rules: {
      'pnpm/yaml-enforce-settings': 'off',
    },
  })
