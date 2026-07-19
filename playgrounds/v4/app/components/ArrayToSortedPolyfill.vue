<script setup lang="ts">
const source = [3, 1, 2]

const { data, status } = useAsyncData(async () => {
  return source.toSorted((a, b) => a - b).join(',')
}, { server: false })
</script>

<template>
  <div>
    If you see a sorted copy below, it means Array.prototype.toSorted works:
    <div>
      <span v-if="status === 'success'">Array.toSorted result: {{ data }}</span>
      <span v-else>Loading...</span>
    </div>
  </div>
</template>
