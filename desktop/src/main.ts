import { app, BrowserWindow, protocol } from 'electron'
import { resolve, join } from 'node:path'
import { AppLifecycle, MainWindow } from '@multi-op/core'
import { bootstrapDatabase } from './database.js'
import { createRouter } from '@holix/router'
import { createStaticMiddleware } from '@holix/static'
import { SCHEME } from '@multi-op/shared'
import { logger, writeCrashLog } from './logger.js'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

let protocolRegistered = false

// ========== Protocol Scheme Registration ==========
function registerSchemesAsPrivileged() {
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
  logger.info('Creating Electron BrowserWindow...')
  const win = mainWindow.create({
    icon: iconDesktop,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
    },
  })
  logger.info('BrowserWindow created')

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
    logger.info('Registering protocol handler with session...')
    await router.register(win.webContents.session.protocol)
    await waitForProtocol()
    protocolRegistered = true
    logger.info('Protocol handler registered')
  }

  win.on('closed', () => {
    logger.info('Window closed, stopping lifecycle')
    lifecycle.stop()
  })

  if (import.meta.env.DEV) {
    logger.info('Loading dev server URL: http://localhost:4173')
    win.loadURL('http://localhost:4173')
    win.webContents.openDevTools()
  } else {
    const url = `${SCHEME}://app/'`
    logger.info('Loading production URL:', url)
    await win.loadURL(url)
    win.webContents.openDevTools()
  }

  win.once('ready-to-show', () => {
    logger.info('Window ready-to-show')
    win.show()
  })

  return win
}

const bootstrap = async () => {
  logger.info('===== App booting =====')

  // Register custom protocol scheme
  logger.info('Registering protocol scheme...')
  registerSchemesAsPrivileged()
  logger.info('Protocol scheme registered', { scheme: SCHEME })

  // Initialize database (dev → cwd, prod → userData)
  logger.info('Initializing database...')
  bootstrapDatabase()
  logger.info('Database initialized')

  // Start lifecycle
  logger.info('Starting app lifecycle...')
  lifecycle.start()
  logger.info('App lifecycle started', { phase: lifecycle.phase })

  // Listen for lifecycle phase transitions
  lifecycle.onChange((phase, prev) => {
    logger.info(`Lifecycle phase transition: ${prev} -> ${phase}`)
  })

  // Create main window
  logger.info('Creating main window...')
  await createMainWindow()
  logger.info('Main window created')

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
logger.info('Waiting for Electron ready...')
app.whenReady()
  .then(() => {
    logger.info('Electron app ready')
    bootstrap()
  })
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
