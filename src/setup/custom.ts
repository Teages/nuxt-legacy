import type { Nuxt } from '@nuxt/schema'
import { addPluginTemplate, resolveFiles } from '@nuxt/kit'

export interface CustomPolyfillsOptions {
  polyfills?: string[]
  scanDirs?: string[]
}

export async function setupCustomPolyfills(nuxt: Nuxt, options: CustomPolyfillsOptions) {
  // only inject polyfills for targets that need them
  const polyfills: string[] = []

  if (options.polyfills) {
    polyfills.push(...options.polyfills)
  }

  options.scanDirs ??= ['polyfills']
  if (options.scanDirs.length > 0) {
    const found = (await resolveFiles(nuxt.options.srcDir, options.scanDirs))
      .filter(p => ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'].some(ext => p.endsWith(ext)))
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
