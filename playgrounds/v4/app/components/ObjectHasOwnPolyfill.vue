<script setup lang="ts">
const target = { a: 1, b: 2, c: 3 }

const { data, status } = useAsyncData(async () => {
  return !!Object.hasOwn(target, 'a')
}, { server: false })
</script>

<template>
  <div>
    If you see true below, it means Object.hasOwn works:
    <div>
      Does {{ JSON.stringify(target) }} have own property 'a'?
      <span v-if="status === 'success'">{{ data }}</span>
      <span v-else>Loading...</span>
    </div>
  </div>
</template>
