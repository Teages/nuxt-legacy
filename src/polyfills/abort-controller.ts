import { definePolyfill } from '../../src/utils/define-polyfill'

export default definePolyfill({
  name: 'AbortController',
  browserlist: ['partially supports abortcontroller'],
  relyOn: 'AbortSignal',
  setup: (self) => {
    const isPolyfillNeeded = !('AbortController' in self && typeof self.AbortController === 'function')
    if (!isPolyfillNeeded) {
      return
    }

    const SECRET = Symbol('abort signal secret')

    class AbortSignal extends EventTarget {
      _aborted = false
      _onabort: ((this: AbortSignal, ev: Event) => any) | null = null

      constructor(secret: unknown) {
        if (secret !== SECRET) {
          throw new TypeError('Illegal constructor')
        }
        super()
      }

      get aborted() {
        return this._aborted
      }

      get onabort() {
        return this._onabort
      }

      set onabort(handler) {
        if (this._onabort) {
          this.removeEventListener('abort', this._onabort)
        }
        this._onabort = handler
        if (handler) {
          this.addEventListener('abort', handler)
        }
      }
    }

    class AbortController {
      private _signal: AbortSignal

      constructor() {
        this._signal = new AbortSignal(SECRET)
      }

      get signal() {
        return this._signal
      }

      abort() {
        if (this._signal.aborted) {
          return
        }
        this._signal._aborted = true
        const event = new Event('abort')
        this._signal.dispatchEvent(event)
      }
    }

    self.AbortSignal = AbortSignal as any
    self.AbortController = AbortController as any
  },
})
