import { BrowserWindow } from 'electron'
import type { HolixProtocolRouter } from '@holix/router'
import { AppLifecycle } from '@multi-op/core'
import { SCHEME } from '@multi-op/shared'
import { logger } from './logger.js'

export interface WindowOptions {
  /** Absolute path to the preload script */
  preloadPath: string
  /** Absolute path to the window icon */
  iconPath: string
  /** Application lifecycle manager */
  lifecycle: AppLifecycle
  /** Holix router for custom protocol handling */
  router: HolixProtocolRouter
}

/**
 * Create the main application window.
 *
 * The window is created with `show: false` and only becomes visible after the
 * `ready-to-show` event fires, preventing a white flash on startup.
 */
export async function createAppWindow(options: WindowOptions): Promise<BrowserWindow> {
  const { preloadPath, iconPath, lifecycle, router } = options

  logger.info('Creating Electron BrowserWindow...')

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    title: 'MultiOp',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
    },
  })

  logger.info('BrowserWindow created')

  await registerProtocol(win, router)

  win.on('closed', () => {
    logger.info('Window closed, stopping lifecycle')
    lifecycle.stop()
  })

  await loadContent(win)

  win.once('ready-to-show', () => {
    logger.info('Window ready-to-show, now visible')
    win.show()
  })

  return win
}

// ─── Internal Helpers ─────────────────────────────────────────

async function registerProtocol(win: BrowserWindow, router: HolixProtocolRouter): Promise<void> {
  logger.info('Registering protocol handler with session...')
  await router.register(win.webContents.session.protocol)
  logger.info('Protocol handler registered')
}

async function loadContent(win: BrowserWindow): Promise<void> {
  if (import.meta.env.DEV) {
    logger.info('Loading dev server URL: http://localhost:4173')
    win.loadURL('http://localhost:4173')
    win.webContents.openDevTools()
  } else {
    const url = `${SCHEME}://app/`
    logger.info('Loading production URL:', url)
    win.loadURL(url)
  }
}
