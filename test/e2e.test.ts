import type { WebDriver } from 'selenium-webdriver'
import { createRequire } from 'node:module'
import process from 'node:process'
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
import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'
import { getPort } from 'get-port-please'
import { Builder, By, until } from 'selenium-webdriver'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { Local: BsLocal } = require('browserstack-local')

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Load .env from the repo root before reading env vars. `process.loadEnvFile`
// is the built-in way (Node 20.6+); it throws when the file is missing, so we
// only load it if it exists. Credentials may already be in the environment
// (e.g. CI secrets), in which case .env is a no-op.
try {
  process.loadEnvFile()
}
catch {
  // no .env present (or unreadable) — rely on whatever is already in process.env
}

const BS_USERNAME = process.env.BROWSERSTACK_USERNAME
const BS_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY
const LOCAL_IDENTIFIER = 'nuxt-legacy'

const DEBUG = process.env.E2E_DEBUG === '1'

// Chrome versions mapped to the module's compatibility claims (see README):
// 49  = min required for Vue 3 (Proxy)
// 61  = ESM but pre "widely-available features"
// 91  = no Object.hasOwn, needs core-js polyfill
// latest = regression guard
const CHROME_VERSIONS = ['49.0', '61.0', '91.0', 'latest'] as const

// Text that only appears after client-side hydration succeeds: SSR renders
// `Loading...`; the value lands only once the legacy chunk has executed the
// dynamic import / polyfill on the client.
const DYNAMIC_IMPORT_DONE = '1 + 2 = 3'
const OBJECT_HAS_OWN_DONE = 'true'

// DecideIsLegacy reports which build the browser loaded, via the compile-time
// `import.meta.env.LEGACY` flag (true in the legacy build, false in the modern
// build). The assertion picks the exact marker per Chrome version below.
const LEGACY_BROWSER_MARKER = 'You are using a legacy browser'
const MODERN_BROWSER_MARKER = 'You are using a modern browser'

let bsLocal: InstanceType<typeof BsLocal> | undefined
let targetUrl = ''

// ---------------------------------------------------------------------------
// BrowserStack Local tunnel
// ---------------------------------------------------------------------------

async function startTunnel(): Promise<void> {
  if (!BS_ACCESS_KEY) {
    return
  }
  bsLocal = new BsLocal()
  await new Promise<void>((resolve, reject) => {
    bsLocal!.start(
      {
        key: BS_ACCESS_KEY!,
        localIdentifier: LOCAL_IDENTIFIER,
        daemonized: true,
      },
      (error: unknown) => {
        if (error) {
          reject(new Error(`BrowserStackLocal failed to start: ${error}`))
          return
        }
        if (!bsLocal!.isRunning()) {
          reject(new Error('BrowserStackLocal reported not running after start'))
          return
        }
        console.warn('[e2e] BrowserStackLocal tunnel connected')
        resolve()
      },
    )
  })
}

async function stopTunnel(): Promise<void> {
  if (!bsLocal) {
    return
  }
  await new Promise<void>((resolve) => {
    try {
      bsLocal!.stop((error: unknown) => {
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
  bsLocal = undefined
}

// ---------------------------------------------------------------------------
// Selenium helpers
// ---------------------------------------------------------------------------

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
    return await el.getAttribute('innerText')
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

async function dumpDiagnostics(driver: WebDriver, chromeVersion: string, label: string) {
  const currentUrl = await safe(() => driver.getCurrentUrl(), '?')
  const title = await safe(() => driver.getTitle(), '?')
  const bodyText = await safe(() => pageText(driver), '(unreadable)')
  console.error(
    `\n[diag ${chromeVersion} ${label}] url=${currentUrl}\n`
    + `[diag ${chromeVersion} ${label}] title=${title}\n`
    + `[diag ${chromeVersion} ${label}] body:\n${bodyText.slice(0, 1500)}\n`,
  )
}

async function waitForText(driver: WebDriver, chromeVersion: string, needle: string, { timeoutMs = 30000 } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const text = await pageText(driver)
    if (text.includes(needle)) {
      return
    }
    await new Promise(r => setTimeout(r, 500))
  }
  await dumpDiagnostics(driver, chromeVersion, `wait-timeout:${needle}`)
  throw new Error(`Chrome ${chromeVersion}: never saw "${needle}" within ${timeoutMs}ms`)
}

async function assertHydrated(driver: WebDriver, chromeVersion: string) {
  if (DEBUG) {
    await dumpDiagnostics(driver, chromeVersion, 'after-load')
  }

  // Primary: DynamicImport.vue SSR-renders `Loading...`, resolves to `3` only
  // once the legacy chunk executes the dynamic import on the client.
  await waitForText(driver, chromeVersion, DYNAMIC_IMPORT_DONE)

  // Secondary: Object.hasOwn is absent in Chrome < 93 — only reachable if the
  // core-js polyfill loaded and the legacy entry executed.
  await waitForText(driver, chromeVersion, OBJECT_HAS_OWN_DONE)

  // Tertiary: DecideIsLegacy reports which build the browser loaded, via the
  // compile-time `import.meta.env.LEGACY` flag. Whether a Chrome version loads
  // the modern or legacy chunk depends on whether it supports the modern ESM
  // features the detection script probes (import.meta, dynamic import, async
  // iterators). Empirically: 49/61 fall back to legacy; 91/latest run modern.
  const isLegacy = chromeVersion === '49.0' || chromeVersion === '61.0'
  const expected = isLegacy ? LEGACY_BROWSER_MARKER : MODERN_BROWSER_MARKER
  await waitForText(driver, chromeVersion, expected)
}

// ---------------------------------------------------------------------------
// suite
// ---------------------------------------------------------------------------

// Only run when BrowserStack credentials are available (set via .env or the
// environment). When absent the whole suite is skipped — no server build, no
// tunnel, no remote sessions — so `pnpm test:e2e` is a harmless no-op on
// machines without setup (e.g. a forked PR's CI, where repo secrets are
// unavailable).
const hasCredentials = Boolean(BS_USERNAME && BS_ACCESS_KEY)

describe.runIf(hasCredentials)('e2e', async () => {
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

  beforeAll(async () => {
    // Build the absolute URL ourselves rather than reading ctx.url, which can
    // resolve to "/" before `startServer` populates it. @nuxt/test-utils binds
    // the server to 127.0.0.1 on the port we requested.
    targetUrl = `http://127.0.0.1:${port}/`
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

    await startTunnel()
    // let the hub register the local identifier before sessions connect
    await new Promise(r => setTimeout(r, 2000))
  }, 300000)

  afterAll(async () => {
    await stopTunnel()
  })

  for (const chromeVersion of CHROME_VERSIONS) {
    describe(`e2e: Chrome ${chromeVersion}`, () => {
      let driver: WebDriver

      beforeAll(async () => {
        driver = await new Builder()
          .usingServer('https://hub.browserstack.com/wd/hub')
          .withCapabilities(buildCapabilities(chromeVersion))
          .build()
      }, 120000)

      afterAll(async () => {
        if (driver) {
          try {
            await driver.executeScript(
              `browserstack_executor: ${JSON.stringify({ action: 'setSessionStatus', arguments: { status: 'passed' } })}`,
            )
          }
          catch {
            // ignore — don't mask the real test result
          }
          await driver.quit()
        }
      })

      it('hydrates the legacy chunks and runs polyfills', async () => {
        await driver.get(targetUrl)
        // Wait for the SSR-rendered <h1> first — it needs no JS, so reaching it
        // proves the page loaded (vs. tunnel / DNS failure).
        await driver.wait(
          until.elementLocated(By.css('h1')),
          30000,
          `Chrome ${chromeVersion}: page never rendered <h1> (did it load at all?)`,
        )
        await assertHydrated(driver, chromeVersion)
        expect(true).toBe(true)
      }, 180000)
    })
  }
})
