# @teages/nuxt-legacy

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt module for supporting legacy browsers.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)

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
