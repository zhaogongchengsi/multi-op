import { useEffect, useRef, useCallback } from 'react'

import { sendThemeToWebview } from '~/utils/webview-theme'
import { settingsStore } from '~/stores/settings-store'
import { addWebview, removeWebview as removeWebviewFromStore } from '~/stores/webview-store'

// ─── Active webview tracking (for TopNav tabs) ────────────────────
export type { ActiveWebview } from '~/stores/webview-store'

// ─── Module-level pool state ───────────────────────────────────────
let poolContainer: HTMLDivElement | null = null
function ensurePoolContainer(): HTMLDivElement {
  if (poolContainer && poolContainer.isConnected) return poolContainer
  poolContainer = document.createElement('div')
  poolContainer.id = '__webview-pool'
  poolContainer.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    overflow: hidden;
  `
  document.body.prepend(poolContainer)
  return poolContainer
}

// Global pool of webviews keyed by id
const webviewPool = new Map<
  string,
  { el: HTMLElement; src: string; partition: string; visible: boolean }
>()


// True webview element — can be <webview> if tag is enabled, or <iframe> fallback
function createPooledWebview(
  id: string,
  src: string,
  partition: string,
): HTMLElement {
  const container = ensurePoolContainer()

  let el: HTMLElement
  el = document.createElement('webview')
  el.setAttribute('src', src)
  el.setAttribute('partition', partition)
  el.setAttribute('allowpopups', '')
  el.setAttribute('webpreferences', 'contextIsolation=yes')
  if (window.bridge?.webviewPreloadPath) {
    el.setAttribute('preload', `file://${window.bridge.webviewPreloadPath}`)
  }

  el.id = `webview-pool-${id}`
  el.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    visibility: hidden;
    pointer-events: auto;
  `
  container.appendChild(el)

  // Apply current theme to the new webview
  sendThemeToWebview(el, settingsStore.state.theme)

  const record = { el, src, partition, visible: false }
  webviewPool.set(id, record)
  addWebview(id)
  return el
}

function getOrCreate(id: string, src: string, partition: string): HTMLElement {
  const existing = webviewPool.get(id)
  if (existing) {
    // Update src/partition if changed
    if (existing.src !== src) {
      existing.el.setAttribute('src', src)
      existing.src = src
    }
    if (existing.partition !== partition) {
      existing.el.setAttribute('partition', partition)
      existing.partition = partition
    }
    return existing.el
  }
  return createPooledWebview(id, src, partition)
}

function showWebview(id: string, slotRect: DOMRect) {
  const record = webviewPool.get(id)
  if (!record) return

  record.el.style.visibility = 'visible'
  record.el.style.top = `${slotRect.top}px`
  record.el.style.left = `${slotRect.left}px`
  record.el.style.width = `${slotRect.width}px`
  record.el.style.height = `${slotRect.height}px`
  record.visible = true
}

function hideWebview(id: string) {
  const record = webviewPool.get(id)
  if (!record) return

  record.el.style.visibility = 'hidden'
  record.visible = false
}

function removeWebview(id: string) {
  const record = webviewPool.get(id)
  if (!record) return

  record.el.remove()
  webviewPool.delete(id)
  removeWebviewFromStore(id)
}

// ─── Hook ───────────────────────────────────────────────────────────

/**
 * Returns a callback ref to attach to a slot div. The hook manages a
 * pooled <webview> that is positioned absolutely over the slot.
 *
 * The webview lives in a fixed body-level container (z-index:0) and is
 * never removed from the DOM — only shown/hidden and repositioned —
 * so the session persists across React re-renders and route changes.
 */
export function useWebviewSlot(id: string, src: string, partition: string) {
  const slotRef = useRef<HTMLDivElement | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  const syncPosition = useCallback(() => {
    const slot = slotRef.current
    if (!slot) {
      hideWebview(id)
      return
    }
    const rect = slot.getBoundingClientRect()
    showWebview(id, rect)
  }, [id])

  const callbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Cleanup previous observer
      if (roRef.current && slotRef.current) {
        roRef.current.unobserve(slotRef.current)
        roRef.current.disconnect()
        roRef.current = null
      }

      if (node) {
        // Mount: get or create the webview, start observing the slot
        getOrCreate(id, src, partition)
        slotRef.current = node

        // Initial position sync
        const rect = node.getBoundingClientRect()
        showWebview(id, rect)

        // Watch for resize/move
        roRef.current = new ResizeObserver(syncPosition)
        roRef.current.observe(node)
      } else {
        // Unmount: hide webview
        hideWebview(id)
      }
    },
    [id, src, partition, syncPosition],
  )

  // Re-sync on window resize / scroll (ResizeObserver doesn't catch position changes from scroll/parent resize)
  useEffect(() => {
    const onResize = () => syncPosition()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [syncPosition])

  // Cleanup webview when hook unmounts permanently (key change = component fully gone)
  useEffect(() => {
    return () => {
      hideWebview(id)
    }
  }, [id])

  return callbackRef
}

/**
 * Removes a webview from the pool entirely (destroys the webview element).
 * Use this when a chat is deleted or should be permanently unloaded.
 */
export function destroyWebview(id: string) {
  removeWebview(id)
}

