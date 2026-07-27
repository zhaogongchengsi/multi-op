/**
 * Webview preload script — injected into <webview> elements.
 * Built to CJS (no ESM syntax) because webview sandbox doesn't support ES modules.
 */

/* eslint-disable */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('webviewBridge', {
  /** Minimal IPC for webview-specific communication */
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(`webview:${channel}`, ...args)
  },
  invoke: (channel: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(`webview:${channel}`, ...args)
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args)
    ipcRenderer.on(`webview:${channel}`, listener)
    return () => ipcRenderer.removeListener(`webview:${channel}`, listener)
  },
})

// ─── Theme synchronization ───────────────────────────────────────
// Listen for theme-change sent from host via webview.send()
ipcRenderer.on('theme-change', (_event: Electron.IpcRendererEvent, mode: 'light' | 'dark' | 'system') => {
  const resolved = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode
  document.documentElement.style.colorScheme = resolved
  document.documentElement.setAttribute('data-theme', resolved)
})

// Notify main process when a page finishes loading
document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('webview:ready', {
    url: window.location.href,
    title: document.title,
  })
})
