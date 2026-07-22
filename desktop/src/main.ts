import { app, BrowserWindow, ipcMain, protocol } from 'electron'
import { resolve, join } from 'node:path'
import { AppLifecycle, MainWindow } from '@multi-op/core'
import { Logger, ConsoleTransport, FileTransport } from '@multi-op/logger'
import type { LogLevel, LogEntry } from '@multi-op/logger'
import { bootstrapDatabase } from './database.js'
import { createRouter } from '@holix/router'
import { createStaticMiddleware } from '@holix/static'
import { SCHEME } from '@multi-op/shared'

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
    },
  },
])

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

let protocolRegistered = false
// ========== Logger ==========
const logDir = import.meta.env.DEV
  ? join(process.cwd(), 'logs')
  : join(app.getPath('userData'), 'logs')

export const logger = new Logger({
  level: import.meta.env.DEV ? 'debug' : 'info',
  source: 'main',
  transports: [
    new ConsoleTransport(),
    new FileTransport({ dir: logDir }),
  ],
})

// Listen for renderer logs
ipcMain.handle('logger:log', (_event, entry: { level: LogLevel; args: unknown[]; timestamp: number }) => {
  logger.child({ source: 'renderer' }).info(...entry.args)
})

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

  if (win && !protocolRegistered) {
    router.register(win.webContents.session.protocol)
    protocolRegistered = true
  }

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
  logger.info('App booting...')

  // Initialize database (dev → cwd, prod → userData)
  bootstrapDatabase()

  // Start lifecycle
  lifecycle.start()

  // Create main window
  createMainWindow()

  // macOS: re-create window on activate
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.info('Re-creating main window on activate')
      createMainWindow()
    }
  })

  // Quit when all windows closed (non-macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      logger.info('All windows closed, quitting app')
      app.quit()
    }
  })

  // Cleanup on quit
  app.on('before-quit', () => {
    logger.info('App quitting...')
    lifecycle.stop()
  })
}

// ========== Entry ==========
app
  .whenReady()
  .then(bootstrap)
  .catch((err: unknown) => {
    logger.error('Bootstrap failed:', err)
    process.exit(1)
  })

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason) => {
  logger.warn('Unhandled Rejection:', reason)
})
