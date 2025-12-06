import type { Nuxt } from '@nuxt/schema'
import { addPluginTemplate, resolveFiles, resolvePath } from '@nuxt/kit'

export interface CustomPolyfillsOptions {
  /**
   * Array of polyfill file paths to be imported
   */
  polyfills?: string[]
  /**
   * Directories to scan for polyfill files
   *
   * This dir is relative to the project `srcDir`.
   * @default ['polyfills']
   */
  scanDirs?: string[]
}

export async function setupCustomPolyfills(nuxt: Nuxt, options: CustomPolyfillsOptions) {
  const polyfills: string[] = []

  if (options.polyfills) {
    for (const path of options.polyfills) {
      polyfills.push(await resolvePath(path, { cwd: nuxt.options.srcDir }))
    }
  }

  options.scanDirs ??= ['polyfills']
  if (options.scanDirs.length > 0) {
    const jsExts = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'])
    const found = (await resolveFiles(nuxt.options.srcDir, options.scanDirs))
      .filter(p => jsExts.has(p.slice(p.lastIndexOf('.'))))
      .sort()

    polyfills.push(...found)
  }

  if (polyfills.length === 0) {
    return
  }
  addPluginTemplate({
    filename: 'custom-polyfills-plugin.client.mjs',
    mode: 'client',
    order: -999, // should run before any other plugin
    getContents: () => `
import { defineNuxtPlugin } from '#app/nuxt'
${polyfills.map(p => `import '${p}'`).join('\n')}

export default defineNuxtPlugin({
  name: 'nuxt-legacy:custom-polyfills-plugin',
  setup () {}
})
    `.trim(),
  })
}
