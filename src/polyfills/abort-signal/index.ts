import { definePolyfill } from '../../../src/utils/define-polyfill'

export default definePolyfill({
  name: 'AbortSignal',
  browserlist: ['partially supports abortcontroller'],
  setup: () => {
    // Do it in AbortController polyfill
  },
})
