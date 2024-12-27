export default defineNuxtConfig({
  modules: ['../src/module'],

  legacy: {
    vite: {
      targets: ['fully supports proxy'],
      // renderLegacyChunks: false,
      renderModernChunks: false,

    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2024-12-26',
})
