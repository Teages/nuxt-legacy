import type { Nuxt } from '@nuxt/schema'
import type { ViteLegacyOptions } from '../types'
import { addServerPlugin, createResolver } from '@nuxt/kit'

export async function setupVite(options: ViteLegacyOptions, nuxt: Nuxt) {
  const resolver = createResolver(import.meta.url)
  const legacy = await import('@vitejs/plugin-legacy')
    .then(m => m.default || m)

  nuxt.options.vite = nuxt.options.vite || {}
  nuxt.options.vite.plugins = nuxt.options.vite.plugins || []
  nuxt.options.vite.plugins.unshift(legacy(options))

  nuxt.hook('build:manifest', (manifest) => {
    Object.keys(manifest)
      .forEach((key) => {
        if (!manifest[key].file.endsWith('-legacy.js')) {
          return
        }
        Object.assign(manifest[key], {
          module: false,
          prefetch: false,
          preload: false,
        } satisfies Partial<typeof manifest[string]>)

        if (manifest[key].name === 'polyfills') {
          manifest[key].file = manifest[key].file.replace(/-legacy\.js$/, '-legacy.js#polyfills')
        }
      })
  })

  if (options.renderLegacyChunks ?? true) {
    addServerPlugin(resolver.resolve('../runtime/server/plugin/vite-legacy'))
  }
}
