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
    files: ['playgrounds/v3/package.json'],
    rules: {
      'pnpm/json-enforce-catalog': 'off',
    },
  })
  .append({
    files: ['pnpm-workspace.yaml'],
    rules: {
      'pnpm/yaml-enforce-settings': 'off',
    },
  })
