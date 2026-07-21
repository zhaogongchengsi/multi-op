import { app, BrowserWindow } from 'electron'
import { resolve, join } from 'node:path'
import { AppLifecycle, MainWindow } from '@multi-op/core'
import { runMigrations } from '@multi-op/database'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

// ========== Bootstrap ==========

const lifecycle = new AppLifecycle()
const mainWindow = new MainWindow()

const preloadPath = resolve(__dirname, '../packages/preload/dist/index.mjs')
const rendererPath = resolve(__dirname, '../packages/renderer/dist/index.html')

// Icon paths
const resourcesPath = resolve(__dirname, '../resources')
const iconDesktop = join(resourcesPath, 'icon.svg')

function createMainWindow() {
  const win = mainWindow.create({
    icon: iconDesktop,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
    },
  })

  win.on('closed', () => {
    lifecycle.stop()
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(rendererPath)
  }

  return win
}

const bootstrap = () => {
  // Initialize database
  runMigrations()

  // Start lifecycle
  lifecycle.start()

  // Create main window
  createMainWindow()

  // macOS: re-create window on activate
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })

  // Quit when all windows closed (non-macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // Cleanup on quit
  app.on('before-quit', () => {
    lifecycle.stop()
  })
}

// ========== Entry ==========
app.whenReady().then(bootstrap).catch((err: unknown) => {
  console.error('[MultiOp] Bootstrap failed:', err)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.log('[Main] Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.log('[Main] Unhandled Rejection:', reason)
})
