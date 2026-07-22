import { app, BrowserWindow, ipcMain, protocol } from 'electron'
import { resolve, join } from 'node:path'
import { AppLifecycle, MainWindow } from '@multi-op/core'
import { Logger, ConsoleTransport, FileTransport } from '@multi-op/logger'
import type { LogLevel, LogEntry } from '@multi-op/logger'
import { bootstrapDatabase } from './database.js'
import { createRouter } from '@holix/router'
import { createStaticMiddleware } from '@holix/static'
import { SCHEME } from '@multi-op/shared'
import { writeCrashLog } from './logger.js'

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

const registerSchemesAsPrivileged = async () => {
  if (protocolRegistered) {
    return
  }
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
  protocolRegistered = true
}

registerSchemesAsPrivileged()

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

async function createMainWindow() {
  const win = mainWindow.create({
    icon: iconDesktop,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
    },
  })

  function waitForProtocol(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now()
      const check = () => {
        if (
          win.webContents.session.protocol.isProtocolHandled(SCHEME) ||
          protocol.isProtocolHandled(SCHEME)
        ) {
          resolve()
        } else if (Date.now() - start > timeout) {
          reject(new Error(`Protocol ${SCHEME} not registered within ${timeout}ms`))
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
  }

  if (win && !protocolRegistered) {
    await router.register(win.webContents.session.protocol)
    await waitForProtocol()
    protocolRegistered = true
  }

  win.on('closed', () => {
    lifecycle.stop()
  })

  if (import.meta.env.DEV) {
    win.loadURL('http://localhost:4173')
    win.webContents.openDevTools()
  } else {
    await win.loadURL(`${SCHEME}://app/'`)
    win.webContents.openDevTools()
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  return win
}

const bootstrap = async () => {
  logger.info('App booting...')

  // Initialize database (dev → cwd, prod → userData)
  bootstrapDatabase()

  // Start lifecycle
  lifecycle.start()

  // Create main window
  await createMainWindow()

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
registerSchemesAsPrivileged().then(() => app.whenReady()).then(bootstrap)
.catch((err: unknown) => {
  logger.error('Bootstrap failed:', err)
  if (import.meta.env.PROD) writeCrashLog(err)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  if (import.meta.env.PROD) writeCrashLog(error)
})

process.on('unhandledRejection', (reason) => {
  logger.warn('Unhandled Rejection:', reason)
  if (import.meta.env.PROD) writeCrashLog(reason)
})
