<script setup lang="ts">
const suggestion = computed(() => [
  {
    caniuse: 'https://caniuse.com/proxy',
    feature: 'Proxy',
    reason: 'Requirement for Vue',

    chrome: '49',
    firefox: '18',
    safari: '10',
  },
  {
    caniuse: 'https://caniuse.com/es6-module',
    feature: 'ES6 Modules',
    reason: 'Requirement for vite native support',

    chrome: '61',
    firefox: '60',
    safari: '11',
  },
  {
    caniuse: 'https://caniuse.com/es6-module-dynamic-import',
    feature: 'Dynamic import',
    reason: 'Requirement for vite native support',

    chrome: '63',
    firefox: '67',
    safari: '11.1',
  },
  {
    caniuse: 'https://caniuse.com/mdn-javascript_operators_import_meta',
    feature: 'import.meta',
    reason: 'Requirement for vite native support',

    chrome: '64',
    firefox: '62',
    safari: '11.1',
  },
  {
    caniuse: 'https://caniuse.com/mdn-javascript_builtins_object_hasown',
    feature: 'Object.hasOwn',
    reason: 'Test for Object.hasOwn polyfill',

    chrome: '93',
    firefox: '92',
    safari: '15.4',
  },
] satisfies BrowsersSuggestion[])

interface BrowsersSuggestion {
  feature: string
  caniuse: string
  reason: string

  chrome: string
  firefox: string
  safari: string
}
</script>

<template>
  <div :class="$style.browserSuggestion">
    <table :class="$style.table">
      <thead>
        <tr>
          <th />
          <th>Chrome</th>
          <th>Firefox</th>
          <th>Safari</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in suggestion" :key="item.caniuse">
          <td>
            <NuxtLink :to="item.caniuse">
              {{ item.feature }}
            </NuxtLink>
          </td>
          <td>{{ item.chrome }}</td>
          <td>{{ item.firefox }}</td>
          <td>{{ item.safari }}</td>
          <td>{{ item.reason }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style module>
.browserSuggestion {
  max-width: 100%;
  overflow-y: auto;
}

.table {
  width: 100%;
  max-width: 48rem;
  border-collapse: collapse;
  margin-top: 20px;
}

.table th,
.table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.table tbody tr:hover {
  background-color: #f9f9f9;
}

.table a {
  color: #007bff;
  text-decoration: none;
}

.table a:hover {
  text-decoration: underline;
}
</style>
