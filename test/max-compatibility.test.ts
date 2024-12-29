import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { parse } from 'node-html-parser'
import { describe, expect, it } from 'vitest'

describe('max-compatibility', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/max-compatibility', import.meta.url)),
  })

  it('renders the index page with legacy chunks', async () => {
    const document = parse(await $fetch('/'))

    const decadeIsModern = document.querySelectorAll('script')
      .filter(el => el.innerHTML === `import.meta.url;import("_").catch(()=>1);(async function*(){})().next();if(location.protocol!="file:"){window.__nuxt_is_modern_browser=true}`)
    expect(decadeIsModern.length).toBe(1)

    const notModernWarning = document.querySelectorAll('script')
      .filter(el => el.innerHTML === `!function(){if(window.__nuxt_is_modern_browser)return;console.warn("[@teages/nuxt-legacy]: loading legacy chunks, syntax error above and the same error below should be ignored");var e=document.getElementById("nuxt-legacy-polyfill"),n=document.createElement("script");n.src=e.src,n.onload=function(){System.import(document.getElementById('nuxt-legacy-entry').getAttribute('data-src'))},document.body.appendChild(n)}();`)
    expect(notModernWarning.length).toBe(1)

    const safari10NoModuleFix = document.querySelectorAll('script')
      .filter(el => el.innerHTML === `!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",(function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()}),!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();`)
    expect(safari10NoModuleFix.length).toBe(1)

    const legacyPolyfillScript = document.querySelector('#nuxt-legacy-polyfill')
    expect(
      legacyPolyfillScript?.getAttribute('src'),
    ).toMatch(/\/_nuxt\/.+-legacy.js/)
    expect(
      legacyPolyfillScript?.getAttribute('nomodule'),
    ).toMatch('')

    const legacyEntryScript = document.querySelector('#nuxt-legacy-entry')
    expect(
      legacyEntryScript?.getAttribute('data-src'),
    ).toMatch(/\/_nuxt\/.+-legacy.js/)
    expect(
      legacyEntryScript?.getAttribute('nomodule'),
    ).toMatch('')
    expect(
      legacyEntryScript?.innerHTML,
    ).toMatch(`System.import(document.getElementById('nuxt-legacy-entry').getAttribute('data-src'))`)
  })

  it('modern polyfills should be the first script', async () => {
    const document = parse(await $fetch('/'))

    const firstScript = document.querySelector('script[src]')
    const scriptContent = await $fetch(firstScript!.getAttribute('src')!)
    expect(scriptContent).toContain('https://github.com/zloirock/core-js')
  })
})
