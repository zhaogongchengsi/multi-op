import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { resolveCustomAddressIcon } from './custom-address-icon.js'

export function registerMainIpcHandlers(): void {
  // ─── IPC: Window controls (for frameless window) ──────────────
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  // ─── IPC: Auto-launch ─────────────────────────────────────────
  ipcMain.handle('auto-launch:get', () => {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  })
  ipcMain.handle('auto-launch:set', (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
  })

  // ─── IPC: Theme ───────────────────────────────────────────────
  ipcMain.handle('settings:set-theme', (_event, mode: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = mode
  })

  // ─── IPC: Custom address icon ─────────────────────────────────
  ipcMain.handle('custom-address:resolve-icon', (_event, rawUrl: string) => {
    return resolveCustomAddressIcon(rawUrl)
  })
}
