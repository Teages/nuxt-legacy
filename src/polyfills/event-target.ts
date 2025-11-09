import { definePolyfill } from '../utils/define-polyfill'

export default definePolyfill({
  name: 'EventTarget',
  // https://caniuse.com/mdn-api_eventtarget_eventtarget
  browserlist: [
    'chrome >= 64',
    'edge >= 79',
    'safari >= 14',
    'firefox >= 59',
    'opera >= 51',
    'android >= 64',
    'ios_saf >= 14',
    'samsung >= 9.2',
    'opera_mini >= 80',
    'and_uc >= 15.5',
    'and_ff >= 143',
    'and_qq >= 14.9',
    'kaios >= 3.1',
  ],
  setup: (self) => {
    let isPolyfillNeeded = false
    try {
      // eslint-disable-next-line no-new
      new self.EventTarget()
    }
    catch {
      isPolyfillNeeded = true
    }
    if (!isPolyfillNeeded) {
      return
    }

    function normalizeOptions(options?: AddEventListenerOptions | boolean): AddEventListenerOptions {
      if (typeof options === 'boolean') {
        return { capture: options }
      }
      return options || {}
    }

    class EventTarget {
      private _listeners: Map<string, ListenerWrapper[]>

      constructor() {
        this._listeners = new Map()
      }

      addEventListener(
        type: string,
        listener: EventListener | EventListenerObject,
        options?: AddEventListenerOptions | boolean,
      ) {
        if (arguments.length < 2) {
          throw new TypeError(`Failed to execute 'addEventListener' on 'EventTarget': 2 arguments required, but only ${arguments.length} present.`)
        }

        type = String(type)

        if (listener === null || listener === undefined) {
          return
        }

        if (typeof listener !== 'function' && typeof listener !== 'object') {
          return
        }
        if (typeof listener === 'object' && typeof listener.handleEvent !== 'function') {
          return
        }

        const normalizedOptions = normalizeOptions(options)
        const {
          capture = false,
          once = false,
          passive = false,
          signal,
        } = normalizedOptions

        if (signal && signal.aborted) {
          return
        }

        if (!this._listeners.has(type)) {
          this._listeners.set(type, [])
        }
        const listeners = this._listeners.get(type)!

        const existingIndex = listeners.findIndex(
          wrapper =>
            wrapper.listener === listener
            && wrapper.capture === capture,
        )
        if (existingIndex !== -1) {
          return
        }

        const callback: EventListener = (event: Event) => {
          if (passive) {
            const originalPreventDefault = event.preventDefault
            event.preventDefault = () => { } // empty function
            try {
              if (typeof listener === 'function') {
                listener.call(this, event)
              }
              else {
                listener.handleEvent(event)
              }
            }
            finally {
              event.preventDefault = originalPreventDefault
            }
          }
          else {
            if (typeof listener === 'function') {
              listener.call(this, event)
            }
            else {
              listener.handleEvent(event)
            }
          }

          if (once) {
            this.removeEventListener(type, listener, options)
          }
        }

        const wrapper: ListenerWrapper = {
          listener,
          callback,
          options: normalizedOptions,
          capture,
          once,
          passive,
          signal,
        }

        listeners.push(wrapper)

        if (signal) {
          const abortHandler = () => {
            this.removeEventListener(type, listener, options)
          }
          signal.addEventListener('abort', abortHandler, { once: true })
        }
      }

      dispatchEvent(event: Event): boolean {
        if (arguments.length < 1) {
          throw new TypeError(`Failed to execute 'dispatchEvent' on 'EventTarget': 1 argument required, but only ${arguments.length} present.`)
        }

        if (!event || typeof event !== 'object') {
          throw new TypeError(`Failed to execute 'dispatchEvent' on 'EventTarget': parameter 1 is not of type 'Event'.`)
        }

        const type = event.type
        if (!this._listeners.has(type)) {
          return true
        }

        const listeners = this._listeners.get(type)!.slice()

        Object.defineProperty(event, 'target', {
          value: this,
          writable: false,
          configurable: true,
        })
        Object.defineProperty(event, 'currentTarget', {
          value: this,
          writable: false,
          configurable: true,
        })

        for (const wrapper of listeners) {
          try {
            wrapper.callback.call(this, event)
          }
          catch (error) {
            setTimeout(() => {
              throw error
            }, 0)
          }

          if ((event as any)._stopImmediatePropagation) {
            break
          }
        }

        return !event.defaultPrevented
      }

      removeEventListener(
        type: string,
        listener: EventListener | EventListenerObject,
        options?: EventListenerOptions | boolean,
      ) {
        if (arguments.length < 2) {
          throw new TypeError(`Failed to execute 'removeEventListener' on 'EventTarget': 2 arguments required, but only ${arguments.length} present.`)
        }

        type = String(type)

        if (listener === null || listener === undefined) {
          return
        }

        const { capture = false } = normalizeOptions(options)

        if (!this._listeners.has(type)) {
          return
        }

        const listeners = this._listeners.get(type)!
        const index = listeners.findIndex(
          wrapper =>
            wrapper.listener === listener
            && wrapper.capture === capture,
        )

        if (index !== -1) {
          listeners.splice(index, 1)
        }

        if (listeners.length === 0) {
          this._listeners.delete(type)
        }
      }
    }

    // Ensure `eventTarget instanceof window.EventTarget` is `true` for functions run before polyfill
    if (self.EventTarget) {
      Object.setPrototypeOf(EventTarget.prototype, self.EventTarget.prototype)
    }
    self.EventTarget = EventTarget as any
  },
})

interface ListenerWrapper {
  listener: EventListener | EventListenerObject
  callback: EventListener
  options: AddEventListenerOptions
  capture: boolean
  once: boolean
  passive: boolean
  signal?: AbortSignal
}
