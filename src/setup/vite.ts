import type { createResolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { Options as ViteLegacyOptions } from '@vitejs/plugin-legacy'
import type { Plugin } from 'vite'
import type { LegacySnippets } from '../runtime/snippets/index'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { addServerPlugin, addServerTemplate, resolvePath, useLogger } from '@nuxt/kit'
import { selectSnippets } from '../runtime/snippets/index'
import { parseNodeModulePath } from '../utils/node-module'
import { getNuxtMajorVersion } from '../utils/nuxt'
import { getViteMajor } from '../utils/vite'

const LEGACY_SCRIPT_REGEX = /-legacy\.js$/

export type { ViteLegacyOptions }

/**
 * Outcome of checking the installed `@vitejs/plugin-legacy` major against the
 * consumer's Vite version.
 *
 * - `ok` — the majors match.
 * - `too-new` — the plugin major is newer than the Vite major (e.g. plugin v8
 *   on Vite 7). Only warned about; the plugin is still wired up since it may
 *   still work in some setups.
 * - `too-old` — the plugin major is older than the Vite major (e.g. plugin v7
 *   on Vite 8). This combination cannot build (plugin v7 emits `system` format,
 *   which rolldown does not support), so the caller must skip wiring up the
 *   plugin to avoid a hard build failure.
 */
type PluginLegacyCompatibility = 'ok' | 'too-new' | 'too-old'

/**
 * Reads the installed `@vitejs/plugin-legacy` major version and full version
 * string from its `package.json`, derived from the resolved entry path via
 * `parseNodeModulePath`. The full `version` is surfaced in the mismatch
 * warning; `major` drives the compatibility comparison.
 *
 * Best-effort: any failure is swallowed (returns `{ major: 0 }`) so it never
 * breaks the build.
 */
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

/**
 * Checks the installed `@vitejs/plugin-legacy` major against the consumer's
 * Vite major and warns on a mismatch:
 *
 * - plugin major newer than Vite major → `too-new` (e.g. plugin v8 on Vite 7).
 * - plugin major older than Vite major → `too-old` (e.g. plugin v7 on Vite 8).
 *   plugin v7 emits `system` format, which rolldown (Vite 8's bundler) cannot
 *   build, so it is skipped.
 *
 * Best-effort: an undeterminable plugin major (0) or Vite major (0) is
 * treated as compatible (`ok`).
 */
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
  let resolved: string
  try {
    resolved = await resolvePath(packageName)
  }
  catch (cause) {
    throw new Error(`[@teages/nuxt-legacy] failed to resolve ${packageName}`, { cause })
  }

  const { major: pluginMajor, version: pluginVersion } = await detectPluginLegacyVersion(resolved)
  const viteMajor = await getViteMajor(nuxt)

  // Emit the selected snippets as a virtual nitro module. The server plugin
  // imports `#nuxt-legacy/snippets` and reads the version-correct inline
  // scripts from it. We emit real source (with the `['import','meta','url'].join('.')`
  // trick) rather than `JSON.stringify`-ing the strings, because nitro's
  // bundler rewrites the literal `import.meta.url` even inside string values.
  addServerTemplate({
    filename: '#nuxt-legacy/snippets.mjs',
    getContents: () => snippetsToSource(selectSnippets(pluginMajor)),
  })

  // `too-old` cannot build — skip wiring up the plugin so the app still builds
  // without legacy support. The check emits its own warning.
  if (await checkPluginLegacyCompatibility(pluginMajor, pluginVersion, viteMajor) === 'too-old') {
    return
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

/**
 * Renders a `LegacySnippets` set as ES module source.
 *
 * `import.meta.url` is emitted as `${['import','meta','url'].join('.')}` (live
 * code), matching the upstream plugin-legacy source, so nitro's bundler does
 * not rewrite it inside a string literal — which would break the injected
 * `detectModernBrowser` script at runtime.
 */
function snippetsToSource(snippets: LegacySnippets): string {
  // The detector uses `import.meta.url`; rebuild the join trick so it stays
  // as live code rather than a literal string.
  // eslint-disable-next-line no-template-curly-in-string
  const joinTrick = '${[\'import\', \'meta\', \'url\'].join(\'.\')}'
  const detectorWithJoinTrick = snippets.detectModernBrowserDetector.replace(
    'import.meta.url',
    joinTrick,
  )
  return [
    `// Generated by @teages/nuxt-legacy — do not edit.`,
    `const detectModernBrowserVarName = '__vite_is_modern_browser';`,
    `const detectModernBrowserDetector = \`${detectorWithJoinTrick}\`;`,
    `export const safari10NoModuleFix = ${JSON.stringify(snippets.safari10NoModuleFix)};`,
    `export const legacyPolyfillId = ${JSON.stringify(snippets.legacyPolyfillId)};`,
    `export const legacyEntryId = ${JSON.stringify(snippets.legacyEntryId)};`,
    `export const systemJSInlineCode = ${JSON.stringify(snippets.systemJSInlineCode)};`,
    `export const detectModernBrowserCode = \`\${detectModernBrowserDetector};window.\${detectModernBrowserVarName}=true\`;`,
    `export const dynamicFallbackInlineCode = ${JSON.stringify(snippets.dynamicFallbackInlineCode)};`,
  ].join('\n')
}
