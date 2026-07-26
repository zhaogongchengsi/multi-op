import { contextBridge, ipcRenderer } from 'electron'
import { webContentProtocol } from '../main/types'
import type { WebContentBridge } from '../renderer/bridge'
import type { WebContentEvent } from '../main/types'

// =========================================================================
// IPC Bridge
// =========================================================================

/** Well-known key exposed on `window` by this preload helper. */
export const BRIDGE_KEY = '__webcontent_bridge'

/**
 * Create the IPC bridge ({@link WebContentBridge}) that talks to
 * {@link WebContentManager} in the main process via `ipcRenderer`.
 *
 * Call this from your preload script, then pass the result to
 * `contextBridge.exposeInMainWorld`.
 */
export function createIPCBridge(): WebContentBridge {
  const p = webContentProtocol

  const bridge: WebContentBridge = {
    create: (opts) => ipcRenderer.invoke(p.create.name, opts),
    remove: (id, detachDestroy) =>
      ipcRenderer.invoke(p.remove.name, { id, detachDestroy }),
    loadURL: (id, url) => ipcRenderer.invoke(p.loadURL.name, { id, url }),
    setBounds: (id, bounds) =>
      ipcRenderer.invoke(p.setBounds.name, { id, bounds }),
    reload: (id) => ipcRenderer.invoke(p.reload.name, id),
    goBack: (id) => ipcRenderer.invoke(p.goBack.name, id),
    goForward: (id) => ipcRenderer.invoke(p.goForward.name, id),
    stop: (id) => ipcRenderer.invoke(p.stop.name, id),
    setZoom: (id, factor) =>
      ipcRenderer.invoke(p.setZoom.name, { id, factor }),
    setHidden: (id, hidden) =>
      ipcRenderer.invoke(p.setHidden.name, { id, hidden }),
    setMute: (id, mute) =>
      ipcRenderer.invoke(p.setMute.name, { id, mute }),
    updateProxy: (id, rules, bypassRules) =>
      ipcRenderer.invoke(p.updateProxy.name, { id, rules, bypassRules }),
    captureScreenshot: (id) =>
      ipcRenderer.invoke(p.capture.name, { id }),
    onEvent: (cb: (event: WebContentEvent) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: WebContentEvent) => {
        cb(payload)
      }
      ipcRenderer.on('webcontent:event', handler)
      return () => { ipcRenderer.off('webcontent:event', handler) }
    },
  }

  return bridge
}

// =========================================================================
// Convenience: expose in one call
// =========================================================================

/**
 * Create the IPC bridge and expose it on `window[BRIDGE_KEY]` via
 * `contextBridge`. Call once from your preload script.
 *
 * @example
 * ```ts
 * // preload.ts
 * import { exposeWebContentBridge } from '@multi-op/webcontent/preload'
 * exposeWebContentBridge()
 * ```
 */
export function exposeWebContentBridge(): void {
  contextBridge.exposeInMainWorld(BRIDGE_KEY, createIPCBridge())
}
