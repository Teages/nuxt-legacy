import { EventTarget } from 'event-target-shim'

setup(window)

function setup(self: typeof window) {
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

  self.EventTarget = EventTarget as any
}
