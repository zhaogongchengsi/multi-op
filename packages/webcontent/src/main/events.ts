import mitt from 'mitt'
import type { ViewState } from './types'

// =========================================================================
// Event Map
// =========================================================================

export type WebContentEvents = {
  'view:created':          { id: string }
  'view:removed':          { id: string }
  'view:state-changed':    { id: string; state: ViewState; prevState: ViewState }
  'view:navigated':        { id: string; url: string }
  'view:title-updated':    { id: string; title: string }
  'view:finish-load':      { id: string }
  'view:fail-load':        { id: string; url: string; errorCode: number; errorDescription: string }
  'view:proxy-configured': { id: string; rules: string }
  'pool:full':             { evicted: string }
  'pool:idle-expired':     { id: string }
  'error':                 { id: string; error: Error }
}

// =========================================================================
// Bus
// =========================================================================

/** Global event bus for WebContentManager. */
export const bus = mitt<WebContentEvents>()

/** Shorthand: subscribe with auto-unsubscribe return. */
export function on<E extends keyof WebContentEvents>(
  event: E,
  handler: (payload: WebContentEvents[E]) => void,
): () => void {
  bus.on(event as any, handler as any)
  return () => bus.off(event as any, handler as any)
}
