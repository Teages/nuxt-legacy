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

    vite: {
      build: {
        // required on plugin-legacy 8.1+ to support Chrome <80
        minify: 'terser',
      },
    },
  })
  ```

</details>

## Compatibility

### Nuxt & @vitejs/plugin-legacy

> **On Nuxt 3 or Nuxt 4.0.3–4.4?** Stay on the last compatible release:
> - Nuxt 3 → `@teages/nuxt-legacy@2.0.2` with `@vitejs/plugin-legacy@^7`
> - Nuxt 4.0.3–4.4 → `@teages/nuxt-legacy@2.0.2` with `@vitejs/plugin-legacy@^7`
>
> `@teages/nuxt-legacy@3` requires Nuxt `>=4.5.0` (which ships Vite 8) and `@vitejs/plugin-legacy@^8.0.0`.

`@teages/nuxt-legacy@3` is compatible with Nuxt `>=4.5.0`. It also has experimental support for Nuxt 5 nightly versions.

Use `@vitejs/plugin-legacy@^8.0.0` (Vite 8 ships with both Nuxt 4.5+ and Nuxt 5).

Compatibility with later Nuxt versions is not guaranteed until those versions have been tested and added to the matrix below.

Check the results for current module version:

> The test result runs with custom `AbortController` polyfill, which is not included in this module and you need to add it by yourself, see [Custom Polyfills](#custom-polyfills).

| Nuxt Version | @vitejs/plugin-legacy | Chrome 49                     | Chrome 61                     | Chrome 104 | Chrome 105 | Latest Chrome |
| ------------ | --------------------- | ----------------------------- | ----------------------------- | ---------- | ---------- | ------------- |
| 4.5.x        | 8.x                   | ✅ (with `minify: 'terser'`) | ✅ (with `minify: 'terser'`) | ✅ legacy  | ✅ modern  | ✅ modern     |

### Browser support

The module is tested with the following browsers:

- Chrome 49: the oldest Chrome version with full Proxy support; exercises the non-ESM legacy path
- Chrome 61: supports ESM but not dynamic import; exercises the ESM fallback path
- Chrome 104: the last version before `import.meta.resolve`; exercises the plugin-legacy v8 fallback boundary
- Chrome 105: the first modern Chrome target in plugin-legacy v8; exercises modern chunks and the `Array.prototype.toSorted` polyfill
- Latest Chrome: regression guard for current browsers

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
    // eslint-disable-next-line no-new
    new self.EventTarget()
  }
  catch {
    isPolyfillNeeded = true
  }

  if (!isPolyfillNeeded) {
    return
  }

  // Apply polyfill
  Object.assign(self, { EventTarget })
}
```

## Credits

- [IlyaSemenov/nuxt-vite-legacy](https://github.com/IlyaSemenov/nuxt-vite-legacy): module by [@IlyaSemenov](https://github.com/IlyaSemenov) with [his idea](https://github.com/nuxt/nuxt/issues/15464#issuecomment-1539790246)

- [BrowserStack](https://www.browserstack.com/open-source). This project is tested with BrowserStack.

## Contribution

<details>
  <summary>Local development</summary>

  ```bash
  # Enable Corepack and install dependencies
  corepack enable
  pnpm install

  # Generate type stubs
  pnpm dev:prepare

  # Develop with the playground
  pnpm dev

  # Build the playground
  pnpm dev:build

  # Run ESLint
  pnpm lint

  # Run Vitest
  pnpm test
  pnpm test:watch

  # Run type checks
  pnpm test:types
  ```

  Releases are managed by the automated workflow in [`.github/workflows/release.yml`](./.github/workflows/release.yml).

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
