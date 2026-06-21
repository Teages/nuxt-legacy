import type { createResolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { Options as ViteLegacyOptions } from '@vitejs/plugin-legacy'
import type { Plugin } from 'vite'
import { pathToFileURL } from 'node:url'
import { addServerPlugin, resolvePath } from '@nuxt/kit'

const LEGACY_SCRIPT_REGEX = /-legacy\.js$/

export type { ViteLegacyOptions }

/**
 * Patches `@vitejs/plugin-legacy` plugins to be compatible with Nuxt's experimental
 * `viteEnvironmentApi` mode.
 *
 * plugin-legacy stores the resolved config in a module-level shared variable shared
 * across its three plugins. In env-API mode, `configResolved` runs once per environment
 * (client + ssr), and the ssr environment (where `config.build.ssr === true`) is resolved
 * last, overwriting the shared config. The client environment's `generateBundle` /
 * `renderChunk` then read the stale `config.build.ssr === true` and bail out early
 * (`if (config.build.ssr) return;`), so the legacy polyfill chunk is never emitted.
 *
 * The fix wraps `configResolved` so the ssr environment's config is ignored, leaving the
 * client config as the last write — matching plugin-legacy's single-environment assumption.
 */
function patchForEnvironmentApi(nuxt: Nuxt, plugins: Plugin[]): Plugin[] {
  // Only patch when the Environment API is in use.
  if (!nuxt.options.experimental.viteEnvironmentApi) {
    return plugins
  }

  return plugins.map((plugin) => {
    // `configResolved` may be a plain function or `{ handler, order }`.
    const userConfigResolved = (plugin as any).configResolved
    if (typeof userConfigResolved !== 'function' && typeof userConfigResolved?.handler !== 'function') {
      return plugin
    }
    const handler = typeof userConfigResolved === 'function' ? userConfigResolved : userConfigResolved.handler

    return {
      ...plugin,
      configResolved(config: any) {
        // Let plugin-legacy skip the ssr environment entirely, so it never overwrites
        // the shared `config` variable captured by the client environment.
        if (config?.build?.ssr) {
          return
        }
        return handler.call(this, config)
      },
    } as Plugin
  })
}

export async function setupVite(options: ViteLegacyOptions, nuxt: Nuxt, moduleResolver: ReturnType<typeof createResolver>) {
  // Resolve from the consuming project (nuxt.options.rootDir) instead of this
  // module's own location, so each project picks up its own plugin-legacy
  // version (e.g. v7 for Vite 7, v8 for Vite 8). The resolved path is loaded
  // via a file URL so the native ESM loader handles it, bypassing jiti which
  // would otherwise try to transpile the already-compiled package.
  const legacy = await resolvePath('@vitejs/plugin-legacy')
    .then(resolved => import(pathToFileURL(resolved).href).then(m => m.default || m))
    .catch(() => null)
  if (!legacy) {
    throw new Error('[@teages/nuxt-legacy] @vitejs/plugin-legacy is not installed')
  }

  nuxt.options.vite ??= {}
  nuxt.options.vite.plugins ??= []
  const resolvedLegacy = legacy(options)
  const legacyPlugins = (Array.isArray(resolvedLegacy) ? resolvedLegacy : [resolvedLegacy]) as Plugin[]
  nuxt.options.vite.plugins.unshift(...patchForEnvironmentApi(nuxt, legacyPlugins))

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
          meta.file = meta.file.replace(LEGACY_SCRIPT_REGEX, '-legacy.js#polyfills')
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
