import { app, BrowserWindow } from 'electron'
import { resolve, join } from 'node:path'
import { AppLifecycle, MainWindow } from '@multi-op/core'
import { bootstrapDatabase } from './database.js'
import { createRouter } from '@holix/router'
import { createStaticMiddleware } from '@holix/static'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

// ========== Bootstrap ==========
const router = createRouter()
const lifecycle = new AppLifecycle()
const mainWindow = new MainWindow()

const preloadPath = join(__dirname, 'preload.mjs')
const resourcesPath = resolve(__dirname, '../resources')
const iconDesktop = join(resourcesPath, 'icon.svg')

// 生产环境静态文件服务
if (import.meta.env.PROD) {
  router.use(
    createStaticMiddleware({
      root: resolve(import.meta.dirname, './client'),
      prefix: '/',
      ignorePaths: ['/api/**', '/trpc/**'],
    }),
  )
}

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

  if (import.meta.env.DEV) {
    win.loadURL('http://localhost:4173')
    win.webContents.openDevTools()
  } else {
    const rendererPath = join(process.resourcesPath, 'renderer', 'index.html')
    win.loadFile(rendererPath)
  }

  return win
}

const bootstrap = () => {
  // Initialize database (dev → cwd, prod → userData)
  bootstrapDatabase()

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
