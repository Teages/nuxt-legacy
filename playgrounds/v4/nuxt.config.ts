export default defineNuxtConfig({
  modules: ['../../src/module'],

  legacy: {
    vite: {
      targets: ['fully supports proxy'],
      modernPolyfills: true,
    },
  },

  // plugin-legacy 8.1+ on Vite 8 defaults to oxc minify, which breaks Chrome
  // <80 (see the build-time warning from @teages/nuxt-legacy). Use terser to
  // keep legacy chunks parseable on the playground's full target range.
  vite: {
    build: {
      minify: 'terser',
    },
  },

  nitro: {
    preset: 'node-server',
    prerender: {
      routes: ['/'],
    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2024-12-26',
})
