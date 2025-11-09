<script setup lang="ts">
const message = ref<string>('Loading...')
const key = '__vite_is_modern_browser'
onMounted(() => {
  switch (true) {
    case import.meta.dev: {
      message.value = 'You are running in development mode'
      break
    }
    case key in window: {
      message.value = 'You are using a modern browser'
      break
    }
    default: {
      message.value = 'You are using a legacy browser'
    }
  }
})
</script>

<template>
  <div>
    {{ message }}
  </div>
</template>
