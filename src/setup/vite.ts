import type { createResolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { Options as ViteLegacyOptions } from '@vitejs/plugin-legacy'
import { addServerPlugin } from '@nuxt/kit'

export type { ViteLegacyOptions }

export async function setupVite(options: ViteLegacyOptions, nuxt: Nuxt, moduleResolver: ReturnType<typeof createResolver>) {
  const legacy = await import('@vitejs/plugin-legacy')
    .then(m => m.default || m)

  nuxt.options.vite = nuxt.options.vite || {}
  nuxt.options.vite.plugins = nuxt.options.vite.plugins || []
  nuxt.options.vite.plugins.unshift(legacy(options))

  nuxt.hook('build:manifest', (manifest) => {
    const manifestEntities = Object.entries(manifest)
    Object.keys(manifest).forEach(key => delete manifest[key])

    // mark legacy chunks and disable preload
    manifestEntities
      .forEach(([_key, meta]) => {
        if (!meta.file.endsWith('-legacy.js')) {
          return
        }
        Object.assign(meta, {
          module: false,
          prefetch: false,
          preload: false,
        } satisfies Partial<typeof manifest[string]>)

        if (meta.name === 'polyfills') {
          meta.file = meta.file.replace(/-legacy\.js$/, '-legacy.js#polyfills')
        }
      })

    // Move polyfills to the top
    const polyfillEntities = manifestEntities
      .filter(([_key, meta]) => meta.name === 'polyfills')
    polyfillEntities.forEach(([key]) =>
      manifestEntities.splice(manifestEntities.findIndex(([k]) => k === key), 1),
    )
    manifestEntities.unshift(...polyfillEntities)

    Object.assign(manifest, Object.fromEntries(manifestEntities))
  })

  if (options.renderLegacyChunks ?? true) {
    addServerPlugin(moduleResolver.resolve('./runtime/server/plugin/vite-legacy'))
  }
}
