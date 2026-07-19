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
import { getViteMajor } from '../utils/vite'

const LEGACY_SCRIPT_REGEX = /-legacy\.js$/

export type { ViteLegacyOptions }

type PluginLegacyCompatibility = 'ok' | 'too-new' | 'too-old'

// Reads plugin-legacy's `package.json`; `{ major: 0 }` on failure (never throws).
async function detectPluginLegacyVersion(resolvedEntry: string): Promise<{ major: number, version?: string }> {
  try {
    const { dir, name } = parseNodeModulePath(resolvedEntry)
    if (!dir || !name) {
      return { major: 0 }
    }
    const pkg = JSON.parse(await readFile(join(dir, name, 'package.json'), 'utf8')) as { version?: string }
    const major = Number.parseInt(String(pkg.version ?? '').match(/^\d+/)?.[0] ?? '', 10)
    if (!Number.isInteger(major)) {
      return { major: 0 }
    }
    return { major, version: pkg.version }
  }
  catch {
    return { major: 0 }
  }
}

async function checkPluginLegacyCompatibility(actualMajor: number, actualVersion: string | undefined, viteMajor: number): Promise<PluginLegacyCompatibility> {
  if (!actualMajor || !viteMajor) {
    return 'ok'
  }

  const tooNew = actualMajor > viteMajor
  const tooOld = actualMajor < viteMajor
  if (!tooNew && !tooOld) {
    return 'ok'
  }

  const versionLabel = actualVersion ?? String(actualMajor)
  const status = tooNew ? 'too-new' : 'too-old'
  const expectedRange = `^${viteMajor}.0.0`
  const detail = tooOld
    ? `It has been disabled to avoid a build failure — legacy browser support is unavailable until you upgrade.`
    : ''
  useLogger('@teages/nuxt-legacy').warn([
    `Detected @vitejs/plugin-legacy@${versionLabel}, which is ${tooNew ? 'too new' : 'too old'} for Vite ${viteMajor}.`,
    `Please install @vitejs/plugin-legacy@${expectedRange} to avoid compatibility issues.`,
    detail,
  ].filter(Boolean).join(' '))
  return status
}

// In env-API mode, plugin-legacy's shared `config` is overwritten by the ssr
// environment, dropping the client's legacy polyfill chunk. Skip ssr configResolved.
function patchForEnvironmentApi(nuxt: Nuxt, plugins: Plugin[]): Plugin[] {
  const usesEnvironmentApi = nuxt.options.experimental.viteEnvironmentApi || getNuxtMajorVersion(nuxt) >= 5

  if (!usesEnvironmentApi) {
    return plugins
  }

  return plugins.map((plugin) => {
    // `configResolved` is either a function or `{ handler, order }`.
    const userConfigResolved = (plugin as any).configResolved
    if (typeof userConfigResolved !== 'function' && typeof userConfigResolved?.handler !== 'function') {
      return plugin
    }
    const handler = typeof userConfigResolved === 'function' ? userConfigResolved : userConfigResolved.handler
    function configResolved(this: unknown, config: any) {
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
  // File URL import bypasses jiti transpiling the already-compiled package.
  let resolved: string
  try {
    resolved = await resolvePath(packageName)
  }
  catch (cause) {
    throw new Error(`[@teages/nuxt-legacy] failed to resolve ${packageName}`, { cause })
  }

  const { major: pluginMajor, version: pluginVersion } = await detectPluginLegacyVersion(resolved)
  const viteMajor = await getViteMajor(nuxt)

  // Skip plugin load on too-old mismatch — major-version skew between
  // plugin-legacy and Vite can fail the build (e.g. v7's `system` output is
  // incompatible with rolldown).
  if (await checkPluginLegacyCompatibility(pluginMajor, pluginVersion, viteMajor) === 'too-old') {
    return pluginMajor
  }

  let legacy
  try {
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

  return pluginMajor
}
