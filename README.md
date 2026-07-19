# @teages/nuxt-legacy

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt module for supporting legacy browsers.

- [✨ &nbsp;Release Notes](https://github.com/Teages/nuxt-legacy/releases)

## Setup

Install the module to your Nuxt application with one command:

```bash
# vite
pnpm add @teages/nuxt-legacy @vitejs/plugin-legacy
```

Then configure it in your `nuxt.config.ts`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@teages/nuxt-legacy'
  ],

  legacy: {
    vite: {}, // `@vitejs/plugin-legacy` options
  },
})
```

<details>
  <summary>maximum compatibility (not recommended)</summary>

  ```ts
  // nuxt.config.ts
  export default defineNuxtConfig({
    modules: [
      '@teages/nuxt-legacy'
    ],

    legacy: {
      vite: {
        targets: ['fully supports proxy'],
        modernPolyfills: true,
      },
    },
  })
  ```

</details>

## Compatibility

### Nuxt & @vitejs/plugin-legacy

> **On Nuxt 3 or Nuxt 4.0–4.4?** Stay on the last compatible release:
> - Nuxt 3 → `@teages/nuxt-legacy@2` with `@vitejs/plugin-legacy@^7`
> - Nuxt 4.0–4.4 → `@teages/nuxt-legacy@3` with `@vitejs/plugin-legacy@^7`
>
> `@teages/nuxt-legacy@4` requires Nuxt `>=4.5.0` (which ships Vite 8) and `@vitejs/plugin-legacy@^8.0.0`.

The module is compatible with Nuxt `>=4.5.0` with this version. It also has experimental support for Nuxt 5 nightly versions. 

Use `@vitejs/plugin-legacy@^8.0.0` (Vite 8 ships with both Nuxt 4.5+ and Nuxt 5).

Since the module does not depend on any implicit behavior, it should work with any later Nuxt version. But I will recheck compatibility after Nuxt releases minor or major versions.

Check the results for current module version:

> The test result runs with custom `AbortController` polyfill, which is not included in this module and you need to add it by yourself, see [Custom Polyfills](#custom-polyfills).

| Nuxt Version | @vitejs/plugin-legacy | Chrome 49 | Chrome 61 | Chrome 91 |
| ------------ | --------------------- | --------- | --------- | --------- |
| 4.5.x        | 8.0.0                 | ✅ PASS   | ✅ PASS   | ✅ PASS¹  |
| 4.5.x        | 8.1+ (incl. latest)   | ⚠️ ²      | ⚠️ ²      | ✅ PASS¹  |

¹ Chrome 91 loads the **legacy** chunk under plugin-legacy v8 — v8's modern detection probes `import.meta.resolve` (Chrome 105+). Hydration still succeeds via the legacy path.

² plugin-legacy 8.1+ regression: legacy chunks contain optional chaining (`?.`, Chrome 80+), which Chrome 49/61 can't parse. Pin `@vitejs/plugin-legacy` to `8.0.0` if you need to support these browsers. Tracked upstream.

### Browser support

The module is tested with the following browsers:

- Chrome 49: The minimum required version for Vue 3
- Chrome 61: supports ESM but does not support [widely-available features](https://vite.dev/guide/build.html#browser-compatibility)
- Chrome 91: not support `Object.hasOwn` but can be polyfilled
- latest Chrome

Hydration in these browsers is verified automatically via [BrowserStack Automate](https://www.browserstack.com/automate) (Selenium WebDriver), which is the only BrowserStack integration that covers Chrome 49 — the Cypress/Playwright adapters require Chrome 83+. See [`test/e2e.test.ts`](./test/e2e.test.ts) and run `pnpm test:e2e` with your BrowserStack credentials.

You can test by yourself by visiting the [playground](https://nuxt-legacy.pages.dev/) with your target browsers.

### Content Security Policy

It injects some inline scripts to [fix legacy browser compatibility](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy#content-security-policy). The hashes keep sync with the latest version of `@vitejs/plugin-legacy`, the current value is:

- `sha256-MS6/3FCg4WjP9gwgaBGwLpRCY6fZBgwmhVCdrPrNf3E=`
- `sha256-tQjf8gvb2ROOMapIxFvFAYBeUJ0v1HCbOcSmDNXGtDo=`
- `sha256-w36slEqa9euNKxfvkw+LLGsDIr++3rsZXpZxtmRh8Aw=`
- `sha256-+5XkZFazzJo8n0iOP4ti/cLCMUudTf//Mzkb7xNPXIc=`

`cspHashes` is also available in the module:

```ts
import { cspHashes } from '@teages/nuxt-legacy'
```

## Custom Polyfills

The module supports custom polyfills to provide additional compatibility for legacy browsers.

This allows you to add polyfills for specific APIs that may not be covered by the Vite legacy plugin (it uses `babel` and `core-js`).

> Since Nuxt 4.2, you need to add `AbortController` polyfill because it will be used in `useFetch` and `useAsyncData` and its polyfill is not included in `core-js`.

### Configuration

You can customize the polyfill behavior in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@teages/nuxt-legacy'],

  legacy: {
    vite: {
      targets: ['fully supports proxy'],
    },

    // Custom polyfills configuration
    customPolyfills: {
      // Specify custom scan directories
      scanDirs: ['polyfills', 'other-polyfills'],

      // Or manually specify polyfill files
      polyfills: [
        './compat/event-target.ts',
        './compat/abort-controller.ts'
      ]
    }
  }
})
```

### Writing Polyfills

Polyfill is a script that runs before your application code.

Here's an example:
```ts
// polyfills/event-target.ts
import { EventTarget } from 'event-target-shim'

setup(window)

function setup(self: typeof window) {
  // Check if polyfill is needed
  let isPolyfillNeeded = false
  try {
    const _ = new self.EventTarget()
  }
  catch {
    isPolyfillNeeded = true
  }

  if (!isPolyfillNeeded) {
    return
  }

  // Apply polyfill
  self.EventTarget = EventTarget
}
```

## Credits

- [IlyaSemenov/nuxt-vite-legacy](https://github.com/IlyaSemenov/nuxt-vite-legacy): module by [@IlyaSemenov](https://github.com/IlyaSemenov) with [his idea](https://github.com/nuxt/nuxt/issues/15464#issuecomment-1539790246)

- [BrowserStack](https://www.browserstack.com/open-source). This project is tested with BrowserStack.

## Contribution

<details>
  <summary>Local development</summary>

  ```bash
  # Install dependencies
  npm install

  # Generate type stubs
  npm run dev:prepare

  # Develop with the playground
  npm run dev

  # Build the playground
  npm run dev:build

  # Run ESLint
  npm run lint

  # Run Vitest
  npm run test
  npm run test:watch

  # Release new version
  npm run release
  ```

</details>

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@teages/nuxt-legacy/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@teages/nuxt-legacy

[npm-downloads-src]: https://img.shields.io/npm/dm/@teages/nuxt-legacy.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/@teages/nuxt-legacy

[license-src]: https://img.shields.io/npm/l/@teages/nuxt-legacy.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@teages/nuxt-legacy

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
