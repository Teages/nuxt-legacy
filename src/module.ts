import type { CustomPolyfillsOptions } from './setup/custom'
import type { ViteLegacyOptions } from './setup/vite'
import { addServerTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { setupCustomPolyfills } from './setup/custom'
import { setupVite } from './setup/vite'

export { cspHashes } from './csp'

export interface ModuleOptions {
  vite?: ViteLegacyOptions
  customPolyfills?: CustomPolyfillsOptions
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@teages/nuxt-legacy',
    configKey: 'legacy',
    compatibility: { nuxt: '^3.18.0 || >=4.0.3' },
  },
  defaults: {},
  setup(options, nuxt) {
    const moduleResolver = createResolver(import.meta.url)

    addServerTemplate({
      filename: '#nuxt-legacy/options.mjs',
      getContents: () => `export const options = ${JSON.stringify(options)}`,
    })

    if (options.vite && nuxt.options.builder === '@nuxt/vite-builder') {
      setupVite(options.vite, nuxt, moduleResolver)
      setupCustomPolyfills(nuxt, options.customPolyfills ?? {})
    }
  },
})
