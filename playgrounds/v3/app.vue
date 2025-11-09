<script setup lang="ts">
</script>

<template>
  <div :class="$style.container">
    <h1>@teages/nuxt-legacy</h1>
    <DynamicImport />
    <ObjectHasOwnPolyfill />

    <div>
      Try these browsers to visit the page:
      <BrowserSuggestion />
    </div>

    <DecideIsLegacy />
  </div>
</template>

<style module>
.container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
