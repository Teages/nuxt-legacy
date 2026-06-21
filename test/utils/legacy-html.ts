import { expect } from 'vitest'

const LEGACY_SCRIPT_REGEX = /\/_nuxt\/.+-legacy\.js/
const DETECT_MODERN_BROWSER_CODE = `import.meta.url;import("_").catch(()=>1);(async function*(){})().next();window.__vite_is_modern_browser=true`
const DYNAMIC_FALLBACK_CODE = `!function(){if(window.__vite_is_modern_browser)return;console.warn("vite: loading legacy chunks, syntax error above and the same error below should be ignored");var e=document.getElementById("vite-legacy-polyfill"),n=document.createElement("script");n.src=e.src,n.onload=function(){System.import(document.getElementById('vite-legacy-entry').getAttribute('data-src'))},document.body.appendChild(n)}();`
const SAFARI_10_NOMODULE_FIX_CODE = `!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",(function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()}),!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();`

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
) {
  const firstScript = document.querySelector('script[src]')
  const scriptContent = await fetchText(firstScript!.getAttribute('src')!)
  expect(scriptContent).toContain('https://github.com/zloirock/core-js')
}
