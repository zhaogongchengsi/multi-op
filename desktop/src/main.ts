import { app, BrowserWindow, protocol } from 'electron'
import { resolve, join } from 'node:path'
import { AppLifecycle } from '@multi-op/core'
import { bootstrapDatabase } from './database.js'
import { createRouter } from '@holix/router'
import { createStaticMiddleware } from '@holix/static'
import { SCHEME } from '@multi-op/shared'
import { logger, writeCrashLog } from './logger.js'
import { createAppWindow } from './window.js'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

// ========== Bootstrap ==========
const router = createRouter()
const lifecycle = new AppLifecycle()

const preloadPath = join(__dirname, 'preload.mjs')
const resourcesPath = resolve(__dirname, '../resources')
const iconPath = join(resourcesPath, 'icon.svg')

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

const bootstrap = async () => {
  logger.info('===== App booting =====')

  // Register custom protocol scheme
  logger.info('Registering protocol scheme...')
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

  // Create main window (created with show: false, shown on ready-to-show)
  logger.info('Creating main window...')
  await createAppWindow({
    preloadPath,
    iconPath,
    lifecycle,
    router,
  })
  logger.info('Main window created')

  // macOS: re-create window on activate
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.info('Re-creating main window on activate')
      createAppWindow({
        preloadPath,
        iconPath,
        lifecycle,
        router,
      })
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
