import { defineConfig } from 'vitest/config'

// The BrowserStack Automate E2E suite (`test/e2e.test.ts`) depends on an
// external service, live credentials and a slow remote browser. It is excluded
// from the default `pnpm test` run and driven separately by `pnpm test:e2e`.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'test/e2e.test.ts'],
  },
})
