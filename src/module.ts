import type { ModuleOptions } from './types'
import { addServerTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { setupVite } from './setup/vite'

export { cspHashes } from './csp'
export * from './types'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@teages/nuxt-legacy',
    configKey: 'legacy',
  },
  defaults: {},
  setup(options, nuxt) {
    const moduleResolver = createResolver(import.meta.url)

    addServerTemplate({
      filename: '#nuxt-legacy/options.mjs',
      getContents: () => `export const options = ${JSON.stringify(options)}`,
    })

    if (options.vite) {
      setupVite(options.vite, nuxt, moduleResolver)
    }
  },
})
