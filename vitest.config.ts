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
//   - `unit`: docs/unit checks, minimal fixtures, and the playground build
//             matrix. Nuxt app builds run serially to keep CI resource usage
//             predictable.
//   - `e2e`:  real-browser hydration on BrowserStack Automate. Long timeouts
//             and single-fork because each test boots a fresh remote browser
//             and parallelism would exhaust the account's session quota.
//
// Run:
//   pnpm test      → unit project
//   pnpm test:e2e  → e2e project
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
          testTimeout: 120000,
          hookTimeout: 120000,
          fileParallelism: false,
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
