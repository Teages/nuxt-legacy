import process from 'node:process'
import { defineConfig, defineProject } from 'vitest/config'

// Load .env from the repo root before anything inspects credentials.
// `process.loadEnvFile` is the built-in way (Node 20.6+); it throws when the
// file is missing, so we swallow that and fall back to the live environment.
try {
  process.loadEnvFile()
}
catch {
  // no .env — rely on whatever is already in process.env (e.g. CI secrets)
}

// Two test projects in one config (see https://vitest.dev/guide/projects):
//   - `unit`: the default fast suite, excludes the BrowserStack E2E spec.
//   - `e2e`:   real-browser hydration on BrowserStack Automate. Long timeouts
//              and single-fork because each test boots a fresh remote browser
//              and parallelism would exhaust the account's session quota.
//
// Run:
//   pnpm test        → both projects
//   pnpm test:unit   → unit only (--project unit)
//   pnpm test:e2e    → e2e only (--project e2e)
//
// Running the e2e project without BrowserStack credentials is an error, raised
// in test/e2e.test.ts when the file is loaded — so `pnpm test:e2e` never
// silently skips everything.
export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          name: 'unit',
          exclude: ['**/node_modules/**', '**/dist/**', 'test/e2e.test.ts'],
        },
      }),
      defineProject({
        test: {
          name: 'e2e',
          include: ['test/e2e.test.ts'],
          testTimeout: 300000,
          hookTimeout: 300000,
          // fileParallelism:false replaces the removed pool:{forks:{singleFork}}
          // combo: each test boots a fresh remote browser, so tests run
          // sequentially to respect the account's session quota.
          fileParallelism: false,
        },
      }),
    ],
  },
})
