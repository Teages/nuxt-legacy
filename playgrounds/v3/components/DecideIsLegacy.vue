<script setup lang="ts">
const message = ref<string>('Loading...')
onMounted(() => {
  // `import.meta.env.LEGACY` is a compile-time constant injected by
  // @vitejs/plugin-legacy: `true` in the legacy (nomodule) build, `false` in
  // the modern build. Unlike the runtime `__vite_is_modern_browser` window
  // flag (set by a module script that runs AFTER the entry mounts), this value
  // is resolved at build time, so there is no timing race in onMounted.
  if (import.meta.dev) {
    message.value = 'You are running in development mode'
  }
  else if (import.meta.env.LEGACY) {
    message.value = 'You are using a legacy browser'
  }
  else {
    message.value = 'You are using a modern browser'
  }
})
</script>

<template>
  <div>
    {{ message }}
  </div>
</template>
