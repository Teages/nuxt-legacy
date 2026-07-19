/**
 * BrowserStack Automate (Selenium WebDriver) E2E tests.
 *
 * These verify that the legacy chunks + polyfills actually hydrate the v4
 * playground in real old browsers. Selenium (not Playwright/Cypress) is the
 * only BrowserStack integration that covers Chrome 49 — those run on the
 * Chrome DevTools Protocol, which BrowserStack only supports from Chrome 83+.
 *
 * The Nuxt server is started by `@nuxt/test-utils/e2e` `setup()` (which also
 * builds the app), on a random port from `get-port-please`. A BrowserStack
 * Local tunnel exposes that server to the remote browser.
 *
 * This file is excluded from the default `pnpm test` run (see root
 * vitest.config.ts); run it via `pnpm test:e2e`. Requires BrowserStack
 * credentials in the environment.
 */
import type { WebDriver } from 'selenium-webdriver'
import { createRequire } from 'node:module'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import { getPort } from 'get-port-please'
import { Builder, By, until } from 'selenium-webdriver'
import { afterAll, beforeAll, describe, it } from 'vitest'

const require = createRequire(import.meta.url)
const { Local: BsLocal } = require('browserstack-local')

// Credentials are loaded from .env (or the live env) by vitest.config.ts before
// this file is evaluated. This file is only collected by the `e2e` test project,
// so loading it implies the user asked to run E2E — missing credentials are a
// hard error, not a skip.
const BS_USERNAME = process.env.BROWSERSTACK_USERNAME
const BS_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY
if (!BS_USERNAME || !BS_ACCESS_KEY) {
  throw new Error(
    'BrowserStack E2E selected but BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY '
    + 'are not set. Put them in a .env file at the repo root or export them.',
  )
}
const LOCAL_IDENTIFIER = 'nuxt-legacy'
const DEBUG = process.env.E2E_DEBUG === '1'

// Chrome versions mapped to the module's compatibility claims (see README):
// 49     = min required for Vue 3 (Proxy), no native ESM
// 61     = native ESM but no dynamic import
// 104    = last Chrome before import.meta.resolve support
// 105    = plugin-legacy v8's minimum modern Chrome target
// latest = regression guard
//
// `isLegacy` records which chunk each version loads. plugin-legacy v8 changed
// the modern/legacy boundary: its detect script now probes `import.meta.resolve`
// (Chrome 105+). Chrome 104 therefore exercises the new fallback boundary,
// while Chrome 105 exercises the first modern version.
//
// `skipReason` skips a version when the toolchain can't support it. Currently
// unused — the v4 playground sets `vite.build.minify: 'terser'` to work around
// plugin-legacy 8.1+'s oxc regression, so Chrome 49/61 are exercisable. Keep
// the field on the interface for future use.
interface ChromeVersion {
  version: string
  isLegacy: boolean
  skipReason?: string
}

const CHROME_VERSIONS: readonly ChromeVersion[] = [
  { version: '49.0', isLegacy: true },
  { version: '61.0', isLegacy: true },
  { version: '104.0', isLegacy: true },
  { version: '105.0', isLegacy: false },
  { version: 'latest', isLegacy: false },
]

// Text that only appears after client-side hydration succeeds: SSR renders
// `Loading...`; the value lands only once the legacy chunk has executed the
// dynamic import / polyfill on the client.
const DYNAMIC_IMPORT_DONE = '1 + 2 = 3'
const OBJECT_HAS_OWN_DONE = 'true'
const ARRAY_TO_SORTED_DONE = 'Array.toSorted result: 1,2,3'

// DecideIsLegacy reports which build the browser loaded, via the compile-time
// `import.meta.env.LEGACY` flag (true in the legacy build, false in the modern
// build). The assertion picks the exact marker per Chrome version below.
const LEGACY_BROWSER_MARKER = 'You are using a legacy browser'
const MODERN_BROWSER_MARKER = 'You are using a modern browser'

// ---------------------------------------------------------------------------
// suite
// ---------------------------------------------------------------------------

describe('e2e', async () => {
  // `setup()` must run before any beforeAll: it registers the build + start
  // hooks that the server-readiness probe below depends on. Making the
  // describe callback async lets us `await` it during the (synchronous) suite
  // registration phase, so those hooks are in place before vitest collects
  // them — without leaving the describe scope.
  const port = await getPort({ ports: [10000, 10001, 10002] })
  await setup({
    rootDir: fileURLToPath(new URL('../playgrounds/v4', import.meta.url)),
    port,
  })

  // Build the absolute URL ourselves rather than reading ctx.url, which can
  // resolve to "/" before `startServer` populates it. @nuxt/test-utils binds
  // the server to 127.0.0.1 on the port we requested.
  const targetUrl = `http://127.0.0.1:${port}/`
  let bsLocal: InstanceType<typeof BsLocal> | undefined

  beforeAll(async () => {
    console.warn('[e2e] targetUrl =', JSON.stringify(targetUrl))

    // Sanity probe: the server must be reachable locally before we open a
    // tunnel to it. setup()'s beforeAll (registered above) has run by now.
    try {
      const res = await fetch(targetUrl)
      console.warn(`[e2e] local probe ${targetUrl} -> HTTP ${res.status}`)
    }
    catch (e) {
      throw new Error(`[e2e] local server not reachable at ${targetUrl}: ${(e as Error).message}`)
    }

    bsLocal = await startTunnel(BS_ACCESS_KEY!)
    // let the hub register the local identifier before sessions connect
    await new Promise(r => setTimeout(r, 2000))
  }, 300000)

  afterAll(async () => {
    await stopTunnel(bsLocal)
  })

  for (const { version, isLegacy, skipReason } of CHROME_VERSIONS) {
    describe(`e2e: Chrome ${version}`, () => {
      let driver: WebDriver

      beforeAll(async () => {
        driver = await new Builder()
          .usingServer('https://hub.browserstack.com/wd/hub')
          .withCapabilities(buildCapabilities(version))
          .build()
      }, 120000)

      let testPassed = false

      afterAll(async () => {
        if (driver) {
          // Reflect the real test outcome in the BrowserStack dashboard, not a
          // blanket "passed" — otherwise failed sessions show green there.
          const status = testPassed ? 'passed' : 'failed'
          try {
            await driver.executeScript(
              `browserstack_executor: ${JSON.stringify({ action: 'setSessionStatus', arguments: { status } })}`,
            )
          }
          catch {
            // ignore — don't mask the real test result
          }
          await driver.quit()
        }
      })

      const test = skipReason ? it.skip : it
      test('hydrates the legacy chunks and runs polyfills', async () => {
        await driver.get(targetUrl)
        // Wait for the SSR-rendered <h1> first — it needs no JS, so reaching it
        // proves the page loaded (vs. tunnel / DNS failure).
        await driver.wait(
          until.elementLocated(By.css('h1')),
          30000,
          `Chrome ${version}: page never rendered <h1> (did it load at all?)`,
        )
        await assertHydrated(driver, version, isLegacy)
        testPassed = true
      }, 180000)
    })
  }
})

// ---------------------------------------------------------------------------
// helpers (kept below the suite so the test reads top-to-bottom)
// ---------------------------------------------------------------------------

// --- BrowserStack Local tunnel --------------------------------------------

async function startTunnel(accessKey: string): Promise<InstanceType<typeof BsLocal>> {
  const local = new BsLocal()
  await new Promise<void>((resolve, reject) => {
    local.start(
      {
        key: accessKey,
        localIdentifier: LOCAL_IDENTIFIER,
        daemonized: true,
      },
      (error: unknown) => {
        if (error) {
          reject(new Error(`BrowserStackLocal failed to start: ${error}`))
          return
        }
        if (!local.isRunning()) {
          reject(new Error('BrowserStackLocal reported not running after start'))
          return
        }
        console.warn('[e2e] BrowserStackLocal tunnel connected')
        resolve()
      },
    )
  })
  return local
}

async function stopTunnel(local?: InstanceType<typeof BsLocal>): Promise<void> {
  if (!local) {
    return
  }
  await new Promise<void>((resolve) => {
    try {
      local.stop((error: unknown) => {
        if (error) {
          console.error('[tunnel stop]', error)
        }
        resolve()
      })
    }
    catch (e) {
      console.error('[tunnel stop]', (e as Error).message)
      resolve()
    }
  })
}

// --- Selenium --------------------------------------------------------------

function buildCapabilities(chromeVersion: string) {
  return {
    'bstack:options': {
      userName: BS_USERNAME,
      accessKey: BS_ACCESS_KEY,
      projectName: 'nuxt-legacy',
      buildName: process.env.GITHUB_REF_NAME || 'nuxt-legacy',
      sessionName: `Chrome ${chromeVersion} hydration`,
      localIdentifier: LOCAL_IDENTIFIER,
      networkLogs: true,
      consoleLogs: 'errors',
    },
    'browserName': 'Chrome',
    'browserVersion': chromeVersion,
  }
}

// Poll the page's rendered text rather than XPath `contains(text(), ...)`,
// because the target strings span multiple DOM nodes (e.g. `1 + 2 = ` in a
// <div> and `3` in a child <span>); XPath text() matches single text nodes.
async function pageText(driver: WebDriver): Promise<string> {
  try {
    const el = await driver.findElement(By.tagName('body'))
    return (await el.getAttribute('innerText')) ?? ''
  }
  catch {
    return ''
  }
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  }
  catch {
    return fallback
  }
}

async function dumpDiagnostics(driver: WebDriver, label: string) {
  const currentUrl = await safe(() => driver.getCurrentUrl(), '?')
  const title = await safe(() => driver.getTitle(), '?')
  const bodyText = await safe(() => pageText(driver), '(unreadable)')
  console.error(
    `\n[diag ${label}] url=${currentUrl}\n`
    + `[diag ${label}] title=${title}\n`
    + `[diag ${label}] body:\n${bodyText.slice(0, 1500)}\n`,
  )
}

async function waitForText(driver: WebDriver, label: string, needle: string, { timeoutMs = 30000 } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const text = await pageText(driver)
    if (text.includes(needle)) {
      return
    }
    await new Promise(r => setTimeout(r, 500))
  }
  await dumpDiagnostics(driver, `${label}:wait-timeout:${needle}`)
  throw new Error(`${label}: never saw "${needle}" within ${timeoutMs}ms`)
}

async function assertHydrated(driver: WebDriver, chromeVersion: string, isLegacy: boolean) {
  const label = `Chrome ${chromeVersion}`

  if (DEBUG) {
    await dumpDiagnostics(driver, `${label}:after-load`)
  }

  // Primary: DynamicImport.vue SSR-renders `Loading...`, resolves to `3` only
  // once the legacy chunk executes the dynamic import on the client.
  await waitForText(driver, label, DYNAMIC_IMPORT_DONE)

  // Secondary: Object.hasOwn is absent in Chrome <93, so the oldest sessions
  // verify that it is present in the legacy polyfill chunk.
  await waitForText(driver, label, OBJECT_HAS_OWN_DONE)

  // Chrome 105 runs the modern build but lacks Array.prototype.toSorted
  // (introduced in Chrome 110), so this verifies the modern polyfill chunk.
  // The older sessions exercise the corresponding legacy polyfill.
  await waitForText(driver, label, ARRAY_TO_SORTED_DONE)

  // DecideIsLegacy reports which build the browser loaded, via the
  // compile-time `import.meta.env.LEGACY` flag. Whether a Chrome version loads
  // the modern or legacy chunk depends on whether it supports the modern ESM
  // features the detection script probes (dynamic import, async generators,
  // and import.meta.resolve). Chrome 49/61/104 use legacy; 105/latest use modern.
  await waitForText(driver, label, isLegacy ? LEGACY_BROWSER_MARKER : MODERN_BROWSER_MARKER)
}
