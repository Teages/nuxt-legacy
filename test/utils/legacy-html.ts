import { expect } from 'vitest'
import { v8 } from '../../src/runtime/snippets/index'

const LEGACY_SCRIPT_REGEX = /\/_nuxt\/.+-legacy\.js/
const DETECT_MODERN_BROWSER_CODE = v8.detectModernBrowserCode
const DYNAMIC_FALLBACK_CODE = v8.dynamicFallbackInlineCode
const SAFARI_10_NOMODULE_FIX_CODE = v8.safari10NoModuleFix

interface ParsedDocument {
  querySelector: (selector: string) => ParsedElement | null
  querySelectorAll: (selector: string) => ParsedElement[]
}

interface ParsedElement {
  innerHTML: string
  getAttribute: (name: string) => string | undefined
}

export function assertLegacyHtml(document: ParsedDocument) {
  const detectModernBrowser = document.querySelectorAll('script')
    .filter(el => el.innerHTML === DETECT_MODERN_BROWSER_CODE)
  expect(detectModernBrowser.length).toBe(1)

  const dynamicFallback = document.querySelectorAll('script')
    .filter(el => el.innerHTML === DYNAMIC_FALLBACK_CODE)
  expect(dynamicFallback.length).toBe(1)

  const safari10NoModuleFix = document.querySelectorAll('script')
    .filter(el => el.innerHTML === SAFARI_10_NOMODULE_FIX_CODE)
  expect(safari10NoModuleFix.length).toBe(1)

  const legacyPolyfillScript = document.querySelector('#vite-legacy-polyfill')
  const legacyPolyfillSrc = legacyPolyfillScript?.getAttribute('src')
  expect(legacyPolyfillSrc).toMatch(LEGACY_SCRIPT_REGEX)
  expect(legacyPolyfillScript?.getAttribute('nomodule')).toMatch('')

  const legacyEntryScript = document.querySelector('#vite-legacy-entry')
  const legacyEntrySrc = legacyEntryScript?.getAttribute('data-src')
  expect(legacyEntrySrc).toMatch(LEGACY_SCRIPT_REGEX)
  expect(legacyEntryScript?.getAttribute('nomodule')).toMatch('')
  expect(legacyEntryScript?.innerHTML).toMatch(
    `System.import(document.getElementById('vite-legacy-entry').getAttribute('data-src'))`,
  )

  return {
    legacyEntrySrc,
    legacyPolyfillSrc,
  }
}

export async function assertModernPolyfillsFirst(
  document: ParsedDocument,
  fetchText: (path: string) => Promise<string>,
  expectedContent?: string,
) {
  const firstScript = document.querySelector('script[src]')
  const scriptContent = await fetchText(firstScript!.getAttribute('src')!)
  expect(scriptContent).toContain('https://github.com/zloirock/core-js')
  if (expectedContent) {
    expect(scriptContent).toContain(expectedContent)
  }
}
