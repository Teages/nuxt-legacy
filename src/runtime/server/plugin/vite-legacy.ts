import type { NitroAppPlugin } from 'nitropack'
import type { ModuleOptions } from '../../../../src/types'
import {
  detectModernBrowserCode,
  dynamicFallbackInlineCode,
  legacyEntryId,
  legacyPolyfillId,
  safari10NoModuleFix,
} from '../../../../src/snippets'

export default <NitroAppPlugin>((nitro) => {
  nitro.hooks.hook('render:html', async (html) => {
    // @ts-expect-error nitro virtual template
    const options = await import('#nuxt-legacy/options.mjs')
      .then(m => m.options as ModuleOptions)

    const genModern = options.vite?.renderModernChunks !== false
    const genLegacy = options.vite?.renderLegacyChunks !== false

    if (!genLegacy) {
      return
    }

    const legacyScripts: string[] = []
    const polyfillScripts: string[] = []
    const todo: (() => void)[] = []

    for (const index in html.head) {
      // get all src="*-legacy.js"
      const matchLegacy = html.head[index].matchAll(
        /<script [^>]*src="([^"]+-legacy\.js)"[^>]*><\/script>\s*/g,
      );
      [...matchLegacy].forEach((match) => {
        if (match) {
          const [full, src] = match
          legacyScripts.push(src)
          todo.push(() => html.head[index] = html.head[index].replace(full, ''))
        }
      })

      // get all src="*-legacy.js#polyfills"
      const matchPolyfill = html.head[index].matchAll(
        /<script[^>]*src="([^"]+-legacy\.js#polyfills)"[^>]*><\/script>\s*/g,
      );
      [...matchPolyfill].forEach((match) => {
        if (match) {
          const [full, src] = match
          polyfillScripts.push(src.replace(/#polyfills$/, ''))
          todo.push(() => html.head[index] = html.head[index].replace(full, ''))
        }
      })
    }

    // normally there should be only one legacy script and one polyfill script
    if (polyfillScripts.length === 1 && legacyScripts.length === 1) {
      const [polyfillSrc] = polyfillScripts
      const [legacySrc] = legacyScripts

      const legacyScripType = genModern ? 'script nomodule' : 'script'

      if (genModern) {
        html.head.push(
          `<script type="module">${detectModernBrowserCode}</script>`,
          `<script type="module">${dynamicFallbackInlineCode}</script>`,
        )
        html.bodyAppend.push(
          `<script nomodule>${safari10NoModuleFix}</script>`,
        )
      }

      html.bodyAppend.push(
        `<${legacyScripType} crossorigin id="${legacyPolyfillId}" src="${polyfillSrc}"></script>`,
        `<${legacyScripType} crossorigin id="${legacyEntryId}" data-src="${legacySrc}">System.import(document.getElementById('${legacyEntryId}').getAttribute('data-src'))</script>`,
      )

      todo.forEach(fn => fn())
    }
  })
})
