import type { CustomPolyfillsOptions } from './setup/custom'
import type { ViteLegacyOptions } from './setup/vite'
import { addServerTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { setupCustomPolyfills } from './setup/custom'
import { setupVite } from './setup/vite'

export { cspHashesFor } from './csp'

export interface ModuleOptions {
  vite?: ViteLegacyOptions
  customPolyfills?: CustomPolyfillsOptions
  /**
   * The package name to resolve for `@vitejs/plugin-legacy`. Used by tests to
   * redirect resolution to an aliased install (e.g. `plugin-legacy-v8`).
   *
   * @internal
   */
  viteLegacyPackageName?: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@teages/nuxt-legacy',
    configKey: 'legacy',
    compatibility: { nuxt: '^3.18.0 || >=4.0.3' },
  },
  defaults: {},
  async setup(options, nuxt) {
    const moduleResolver = createResolver(import.meta.url)

    if (options.vite && nuxt.options.builder === '@nuxt/vite-builder') {
      await setupVite(options.vite, nuxt, moduleResolver, options.viteLegacyPackageName)
    }
    await setupCustomPolyfills(nuxt, options.customPolyfills ?? {})

    addServerTemplate({
      filename: '#nuxt-legacy/options.mjs',
      getContents: () => `export const options = ${JSON.stringify(options)}`,
    })
  },
})
