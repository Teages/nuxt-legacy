export default defineNuxtConfig({
  modules: ['../../src/module'],

  // Enable Vite's Environment API (the build path Nuxt 5 uses by default) to
  // isolate its effect on @vitejs/plugin-legacy in a Nuxt 4 + Vite 7 setup.
  experimental: {
    viteEnvironmentApi: true,
  },

  legacy: {
    vite: {
      targets: ['fully supports proxy'],
      modernPolyfills: true,
    },
  },

  nitro: {
    cloudflare: {},
  },

  devtools: { enabled: true },
  compatibilityDate: '2024-12-26',
})
