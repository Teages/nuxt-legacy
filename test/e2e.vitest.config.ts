import { defineConfig } from 'vitest/config'

// Dedicated config for the BrowserStack Automate (Selenium) E2E suite.
// Run via `pnpm test:e2e`. Long timeouts: booting a remote browser + hydrating
// legacy chunks in Chrome 49 is slow; the project-wide default would flake.
// Sequential (single fork): each test opens a fresh remote browser, and
// parallelism would just exhaust the account's concurrent-session quota.
export default defineConfig({
  test: {
    include: ['test/e2e.test.ts'],
    testTimeout: 300000,
    hookTimeout: 300000,
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
