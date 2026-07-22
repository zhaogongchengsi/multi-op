import { app, BrowserWindow, protocol } from 'electron'
import { resolve, join } from 'node:path'
import { AppLifecycle, MainWindow } from '@multi-op/core'
import { bootstrapDatabase } from './database.js'
import { createRouter } from '@holix/router'
import { createStaticMiddleware } from '@holix/static'
import { SCHEME } from '@multi-op/shared'
import { writeCrashLog } from './logger.js'

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

function waitForProtocol(scheme: string, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      if (protocol.isProtocolHandled(scheme)) {
        resolve()
      } else if (Date.now() - start > timeout) {
        reject(new Error(`Protocol ${scheme} not registered within ${timeout}ms`))
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })
}

async function createMainWindow() {
  const win = mainWindow.create({
    icon: iconDesktop,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (win && !protocolRegistered) {
    await waitForProtocol(SCHEME)
    await router.register(win.webContents.session.protocol)
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
app
  .whenReady()
  .then(bootstrap)
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
