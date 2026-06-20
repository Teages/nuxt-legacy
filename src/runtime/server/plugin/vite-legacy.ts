import type { NitroAppPlugin } from 'nitropack'
import type { ModuleOptions } from '../../../../src/module'
import {
  detectModernBrowserCode,
  dynamicFallbackInlineCode,
  legacyEntryId,
  legacyPolyfillId,
  safari10NoModuleFix,
} from '../../snippets'

const LEGACY_SCRIPT_REGEX = /<script [^>]*src="([^"]+-legacy\.js)"[^>]*><\/script>\s*/g
const LEGACY_POLYFILL_SCRIPT_REGEX = /<script[^>]*src="([^"]+-legacy\.js#polyfills)"[^>]*><\/script>\s*/g
const POLYFILL_END_MATCH_REGEX = /#polyfills$/

interface LegacyHtml {
  head: unknown[]
}

export function extractLegacyScripts(html: LegacyHtml) {
  const legacyScripts: string[] = []
  const polyfillScripts: string[] = []
  const todo: (() => void)[] = []

  for (const index in html.head) {
    const headEntry = html.head[index]

    if (typeof headEntry !== 'string') {
      continue
    }

    // get all src="*-legacy.js"
    const matchLegacy = headEntry.matchAll(LEGACY_SCRIPT_REGEX)
    Array.from(matchLegacy).forEach((match) => {
      if (match) {
        const [full, src] = match
        if (src) {
          legacyScripts.push(src)
        }
        todo.push(() => {
          const current = html.head[index]
          if (typeof current === 'string') {
            html.head[index] = current.replace(full, '')
          }
        })
      }
    })

    // get all src="*-legacy.js#polyfills"
    const matchPolyfill = headEntry.matchAll(LEGACY_POLYFILL_SCRIPT_REGEX)
    Array.from(matchPolyfill).forEach((match) => {
      if (match) {
        const [full, src] = match
        if (src) {
          polyfillScripts.push(src.replace(POLYFILL_END_MATCH_REGEX, ''))
        }
        todo.push(() => {
          const current = html.head[index]
          if (typeof current === 'string') {
            html.head[index] = current.replace(full, '')
          }
        })
      }
    })
  }

  return {
    legacyScripts,
    polyfillScripts,
    removeMatchedScripts: () => todo.forEach(fn => fn()),
  }
}

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

    const { legacyScripts, polyfillScripts, removeMatchedScripts }
      = extractLegacyScripts(html)

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

      removeMatchedScripts()
    }
  })
})
