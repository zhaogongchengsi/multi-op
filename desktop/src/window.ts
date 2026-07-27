import { app, BrowserWindow } from 'electron'
import type { HolixProtocolRouter } from '@holix/router'
import { AppLifecycle } from '@multi-op/core'
import { readConfig, writeConfigDebounced } from '@multi-op/database'
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

  const isMac = process.platform === 'darwin'

  // Restore saved window bounds
  const savedBounds = await loadWindowBounds()

  const win = new BrowserWindow({
    width: savedBounds.width ?? 1200,
    height: savedBounds.height ?? 800,
    ...(savedBounds.x != null ? { x: savedBounds.x } : {}),
    ...(savedBounds.y != null ? { y: savedBounds.y } : {}),
    icon: iconPath,
    title: 'MultiOp',
    show: false,
    ...(isMac
      ? {
          titleBarStyle: 'hidden',
          trafficLightPosition: { x: 16, y: 16 },
        }
      : {
          frame: false,
        }),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
  })

  logger.info('BrowserWindow created')

  await registerProtocol(win, router)

  // Persist window bounds on resize/move (debounced via @tanstack/pacer)
  const persistBounds = () => {
    if (win.isDestroyed()) return
    const bounds = win.getBounds()
    writeConfigDebounced('window', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    })
  }
  win.on('resize', persistBounds)
  win.on('move', persistBounds)

  win.on('closed', () => {
    logger.info('Window closed, stopping lifecycle')
    lifecycle.stop()
  })

  // Quit app when window is closed (all platforms)
  win.on('close', () => {
    logger.info('Window closing, quitting app')
    app.quit()
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

// ─── Window bounds persistence ──────────────────────────────────

interface WindowBounds {
  x?: number
  y?: number
  width?: number
  height?: number
}

async function loadWindowBounds(): Promise<WindowBounds> {
  try {
    const bounds = await readConfig('window')
    return bounds as WindowBounds
  } catch {
    return {}
  }
}
