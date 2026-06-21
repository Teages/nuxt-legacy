export default defineNuxtConfig({
  modules: ['../../src/module'],

  // https://nuxt.com/docs/4.x/guide/going-further/experimental-features#viteenvironmentapi
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
