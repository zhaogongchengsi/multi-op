import { BrowserWindow } from 'electron'

const WINDOW_DEFAULTS: Electron.BrowserWindowConstructorOptions = {
  width: 1200,
  height: 800,
  title: 'MultiOp',
} as const

export class MainWindow {
  create(options?: Electron.BrowserWindowConstructorOptions): BrowserWindow {
    const win = new BrowserWindow({
      ...WINDOW_DEFAULTS,
      ...options,
    })
    return win
  }

  destroy(win: BrowserWindow): void {
    if (!win.isDestroyed()) {
      win.close()
    }
  }
}
