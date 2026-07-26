import type { BoundsRect, WebContentEvent, WebContentOptions } from '../main/types'

// =========================================================================
// Bridge Shape
// =========================================================================

export interface WebContentBridge {
  create(opts: WebContentOptions): Promise<void>
  remove(id: string, detachDestroy?: boolean): Promise<void>
  loadURL(id: string, url: string): Promise<void>
  setBounds(id: string, bounds: BoundsRect): Promise<void>
  reload(id: string): Promise<void>
  goBack(id: string): Promise<void>
  goForward(id: string): Promise<void>
  stop(id: string): Promise<void>
  setZoom(id: string, factor: number): Promise<void>
  setHidden(id: string, hidden: boolean): Promise<void>
  setMute(id: string, mute: boolean): Promise<void>
  updateProxy(id: string, rules: string, bypassRules?: string): Promise<void>
  captureScreenshot(id: string): Promise<{ dataUrl: string }>
  onEvent(cb: (event: WebContentEvent) => void): () => void
}

// =========================================================================
// Singleton
// =========================================================================

let _bridge: WebContentBridge | null = null

/**
 * Explicitly set the bridge singleton. Call this from the page context
 * (not preload!) with the object exposed by {@link exposeWebContentBridge}.
 */
export function initBridge(bridge: WebContentBridge): void {
  if (_bridge) console.warn('[webcontent] bridge already initialised – overwriting.')
  _bridge = bridge
}

export function getBridge(): WebContentBridge | null {
  return _bridge
}

// =========================================================================
// Auto-init
// =========================================================================

/**
 * Try to auto-discover the bridge from
 * `window.__webcontent_bridge` (exposed by
 * {@link exposeWebContentBridge} in preload).
 *
 * Call once from the page before any `<web-content>` elements connect.
 *
 * @returns `true` if the bridge was found and initialised.
 */
export function autoInitBridge(): boolean {
  const win = window as any
  if (win.__webcontent_bridge) {
    initBridge(win.__webcontent_bridge)
    return true
  }
  return false
}

// =========================================================================
// ID Generator
// =========================================================================

let _idCounter = 0

export function nextViewId(): string {
  return `wc-${++_idCounter}-${Date.now()}`
}
