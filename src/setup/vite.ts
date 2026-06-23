import type { createResolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { Options as ViteLegacyOptions } from '@vitejs/plugin-legacy'
import type { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { addServerPlugin, resolvePath, useLogger } from '@nuxt/kit'
import { parseNodeModulePath } from '../utils/node-module'
import { getNuxtMajorVersion } from '../utils/nuxt'

const LEGACY_SCRIPT_REGEX = /-legacy\.js$/

export type { ViteLegacyOptions }

/**
 * Warns when the installed `@vitejs/plugin-legacy` major is out of range for
 * the consumer's Nuxt version:
 *
 * - Nuxt 3 & 4 bundle Vite 7 → plugin-legacy v7. v8+ needs Vite 8 and is too new.
 * - Nuxt 5 bundles Vite 8+ → plugin-legacy v8 or newer. v7 is too old.
 *
 * We deliberately do **not** pin an exact major for Nuxt 5 — it may adopt a
 * newer Vite (and thus a newer plugin-legacy) in a minor release, so only the
 * lower bound is enforced there. The package's own peer range
 * (`^7.0.0 || ^8.0.0`) already guards the lower bound on Nuxt 3/4.
 *
 * The resolved entry path is `…/node_modules/@vitejs/plugin-legacy/dist/index.js`
 * (subpath resolution of `/package.json` is not supported by `resolvePath`),
 * so the package root is derived via `parseNodeModulePath`.
 *
 * Best-effort: any failure to read or parse the version is swallowed so it can
 * never break the build — the warning is purely advisory.
 */
async function warnOnPluginLegacyMismatch(nuxt: Nuxt, resolvedEntry: string): Promise<void> {
  try {
    const { dir, name } = parseNodeModulePath(resolvedEntry)
    if (!dir || !name) {
      return
    }

    const pkg = JSON.parse(await readFile(join(dir, name, 'package.json'), 'utf8')) as { version?: string }
    const actualMajor = Number.parseInt(String(pkg.version ?? '').match(/^\d+/)?.[0] ?? '', 10)
    if (!Number.isInteger(actualMajor)) {
      return
    }

    const nuxtMajor = getNuxtMajorVersion(nuxt)
    const tooNew = nuxtMajor < 5 && actualMajor >= 8
    const tooOld = nuxtMajor >= 5 && actualMajor < 8
    if (!tooNew && !tooOld) {
      return
    }

    const expectedRange = nuxtMajor >= 5 ? '^8.0.0' : '^7.0.0'
    useLogger('@teages/nuxt-legacy').warn(
      `Detected @vitejs/plugin-legacy@${pkg.version}, which is ${tooNew ? 'too new' : 'too old'} for Nuxt ${nuxtMajor}. `
      + `Please install @vitejs/plugin-legacy@${expectedRange} to avoid compatibility issues.`,
    )
  }
  catch {
    // Version detection is best-effort — never fail the build over it.
  }
}

/**
 * Patches `@vitejs/plugin-legacy` plugins to be compatible with Nuxt's Vite
 * Environment API mode.
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
  const usesEnvironmentApi = nuxt.options.experimental.viteEnvironmentApi || getNuxtMajorVersion(nuxt) >= 5

  if (!usesEnvironmentApi) {
    return plugins
  }

  return plugins.map((plugin) => {
    // `configResolved` may be a plain function or `{ handler, order }`.
    const userConfigResolved = (plugin as any).configResolved
    if (typeof userConfigResolved !== 'function' && typeof userConfigResolved?.handler !== 'function') {
      return plugin
    }
    const handler = typeof userConfigResolved === 'function' ? userConfigResolved : userConfigResolved.handler
    function configResolved(this: unknown, config: any) {
      // Let plugin-legacy skip the ssr environment entirely, so it never overwrites
      // the shared `config` variable captured by the client environment.
      if (config?.build?.ssr) {
        return
      }
      return handler.call(this, config)
    }

    return {
      ...plugin,
      configResolved: typeof userConfigResolved === 'function'
        ? configResolved
        : { ...userConfigResolved, handler: configResolved },
    } as Plugin
  })
}

export async function setupVite(options: ViteLegacyOptions, nuxt: Nuxt, moduleResolver: ReturnType<typeof createResolver>, packageName = '@vitejs/plugin-legacy') {
  // Resolve from the consuming project (nuxt.options.rootDir) instead of this
  // module's own location, so each project picks up its own plugin-legacy
  // version (e.g. v7 for Vite 7, v8 for Vite 8). The resolved path is loaded
  // via a file URL so the native ESM loader handles it, bypassing jiti which
  // would otherwise try to transpile the already-compiled package.
  let legacy
  try {
    const resolved = await resolvePath(packageName)
    await warnOnPluginLegacyMismatch(nuxt, resolved)
    legacy = await import(pathToFileURL(resolved).href).then(m => m.default || m)
  }
  catch (cause) {
    throw new Error(`[@teages/nuxt-legacy] failed to load ${packageName}`, { cause })
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
