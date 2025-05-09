export default defineNuxtConfig({
  modules: ['../src/module'],

  legacy: {
    vite: {
      targets: ['fully supports proxy'],
      modernPolyfills: true,
    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2024-12-26',
})
