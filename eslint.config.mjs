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
  )
