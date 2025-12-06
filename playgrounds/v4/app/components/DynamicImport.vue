<script setup lang="ts">
const { data, status } = useAsyncData(async () => {
  const { sum } = await import('../utils/sum')

  return sum(1, 2)
}, { server: false })
</script>

<template>
  <div>
    If you see 3 below, it means dynamic import works:
    <div>
      1 + 2 =
      <span v-if="status === 'success'">{{ data }}</span>
      <span v-else>Loading...</span>
    </div>
  </div>
</template>
