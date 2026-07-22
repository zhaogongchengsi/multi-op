import { app, BrowserWindow, protocol } from 'electron'
import { resolve, join } from 'node:path'
import { AppLifecycle, MainWindow } from '@multi-op/core'
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
  // Initialize database (dev → cwd, prod → userData)
  bootstrapDatabase()

  // Start lifecycle
  lifecycle.start()

  // Create main window
  await createMainWindow()

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
registerSchemesAsPrivileged().then(() => app.whenReady()).then(bootstrap)
.catch((err: unknown) => {
  console.error('[MultiOp] Bootstrap failed:', err)
  if (import.meta.env.PROD) writeCrashLog(err)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.log('[Main] Uncaught Exception:', error)
  if (import.meta.env.PROD) writeCrashLog(error)
})

process.on('unhandledRejection', (reason) => {
  console.log('[Main] Unhandled Rejection:', reason)
  if (import.meta.env.PROD) writeCrashLog(reason)
})
