import { describe, expect, it } from 'vitest'
import { extractLegacyScripts } from '../src/runtime/server/plugin/vite-legacy'

describe('vite legacy server plugin', () => {
  it('ignores non-string head entries when extracting legacy scripts', () => {
    const meta = { tag: 'meta', props: { charset: 'utf-8' } }
    const html = {
      head: [
        meta,
        '<script src="/_nuxt/app-legacy.js"></script>',
        '<script src="/_nuxt/polyfills-legacy.js#polyfills"></script>',
      ],
    }

    const result = extractLegacyScripts(html)

    expect(result.legacyScripts).toEqual(['/_nuxt/app-legacy.js'])
    expect(result.polyfillScripts).toEqual(['/_nuxt/polyfills-legacy.js'])

    result.removeMatchedScripts()

    expect(html.head[0]).toBe(meta)
    expect(html.head[1]).toBe('')
    expect(html.head[2]).toBe('')
  })
})
