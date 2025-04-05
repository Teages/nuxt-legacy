import type { Options as ViteLegacyOptions } from '@vitejs/plugin-legacy'
import { addServerTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'

import { setupVite } from './setup/vite'

export { cspHashes } from './csp'

export interface ModuleOptions {
  vite?: ViteLegacyOptions
}

export type { ViteLegacyOptions }

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
