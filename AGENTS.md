# Repository guidelines

## Project overview

This repository contains `@teages/nuxt-legacy`, a TypeScript Nuxt module that adds legacy-browser support through `@vitejs/plugin-legacy` and optional custom polyfills.

Use Node.js (version see `.nvmrc`), Corepack, and pnpm. Prefer `pnpm` and the scripts in the root `package.json`; do not introduce npm- or yarn-specific lockfiles.

## Repository map

- `src/module.ts`: public module entry point and `ModuleOptions`.
- `src/setup/`: Vite legacy-plugin and custom-polyfill setup.
- `src/runtime/`: runtime server plugin and versioned inline snippets.
- `src/utils/`: package, Nuxt, Vite, and browserslist helpers.
- `test/`: Vitest unit/integration tests and BrowserStack E2E tests.
- `test/fixtures/`: minimal Nuxt fixtures used by tests.
- `playgrounds/v4`, `playgrounds/v4-env`, `playgrounds/v5`: manual and compatibility playgrounds. Each has its own lockfile by design.
- `dist/`, `.nuxt/`, `.output/`: generated output; do not edit these files directly.

## Working conventions

- Match the existing ESM TypeScript style and the ESLint configuration: 2-space indentation, single quotes, no semicolons, trailing commas, and braces for all control-flow blocks.
- Keep public option types and exports in `src/module.ts` or explicitly re-export them from there.
- Use Nuxt Kit APIs for module integration and resolve paths relative to the consuming Nuxt application, not this repository, unless the path is module-owned.
- Preserve compatibility behavior across Nuxt 4 environment-API modes and Nuxt 5. Changes to Vite/plugin-version handling should cover both compatible and mismatched major versions.
- Legacy output is intentionally sensitive to script order, manifest order, filename fragments, and inline script contents. Do not reorder or rewrite these without adding or updating focused tests.
- Keep `README.md` compatibility claims synchronized with implementation and fixtures. If inline snippets or CSP hashes change, update `src/csp.ts`/runtime snippets and the documented hashes together; `test/readme.test.ts` enforces this.
- Do not commit credentials or `.env`. BrowserStack credentials are read from `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY`.
- Do not manually update the package version in `package.json` or any lockfile. CI owns release version bumps; leave version changes to the automated release workflow.
- Avoid unrelated dependency or lockfile churn. When a playground dependency changes, update the corresponding playground lockfile as well as any required root workspace metadata.

## Validation

Run the narrowest relevant test while iterating, then use the applicable repository checks before handing off:

```bash
pnpm lint
pnpm test
pnpm test:types
```

Useful focused commands:

```bash
pnpm exec vitest run --project unit test/utils/targets.test.ts
pnpm exec vitest run --project unit test/basic.test.ts
pnpm dev:prepare
pnpm dev:build
```

Notes:

- `pnpm test` runs the `unit` Vitest project and deliberately excludes `test/e2e.test.ts`.
- Nuxt fixture/playground tests can take up to two minutes and run serially by design.
- Run `pnpm dev:prepare` before type-checking or building when generated module stubs are missing or stale.
- `pnpm test:e2e` starts paid/remote BrowserStack Selenium sessions for Chrome 49, 61, 91, and latest. Run it only when explicitly requested or when credentials and authorization are clearly available; never treat missing credentials as a skipped success.
- For behavior changes, add a regression test near the affected utility/setup code. Prefer fixture-based tests when behavior depends on Nuxt build output.

## Change boundaries

- Do not edit generated artifacts to fix source behavior; change `src/`, tests, fixtures, or playground configuration and regenerate as needed.
- Do not weaken legacy-browser coverage merely to make modern tooling pass. Document unavoidable toolchain limits and preserve warnings that help consumers configure compatible versions or minifiers.
- Keep edits scoped to the request and preserve user changes already present in the working tree.
