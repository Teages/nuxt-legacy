export default defineNuxtConfig({
  modules: ['../../../src/module'],
  legacy: {
    vite: {
      targets: ['fully supports proxy'],
      modernPolyfills: true,
    },
  },
})
