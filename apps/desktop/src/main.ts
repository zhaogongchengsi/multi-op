import { app, BaseWindow, WebContentsView, session } from 'electron'
import { resolve } from 'node:path'
import { createRouter, LayoutManager, AccountManager, ScriptManager, migrateDb } from '@multi-op/core'
import { SCHEME, PLATFORMS } from '@multi-op/shared'
import type { PlatformType } from '@multi-op/shared'
import { getInterceptorCode as tgInterceptor } from '@multi-op/adapter-telegram'
import { getInterceptorCode as waInterceptor } from '@multi-op/adapter-whatsapp'
import { getInterceptorCode as twInterceptor } from '@multi-op/adapter-twitter'

// Interceptor code map
const INTERCEPTORS: Record<string, () => string> = {
  telegram: tgInterceptor,
  whatsapp: waInterceptor,
  twitter: twInterceptor,
}

// ========== Init ==========

const router = createRouter()
const layoutManager = { manager: null as LayoutManager | null }

// ========== Bootstrap ==========

async function bootstrap() {
  // 1. Register custom protocol (before app ready)
  router.registerPrivileged()

  await app.whenReady()

  // 2. Migrate database
  await migrateDb()

  // 3. Create main window
  const win = new BaseWindow({
    width: 1200,
    height: 800,
    title: 'MultiOp',
    webPreferences: {
      preload: resolve(__dirname, '../../packages/preload/src/index.ts'),
      contextIsolation: true,
      sandbox: false,
    },
  })

  // 4. Register router to session
  router.registerToSession()

  // 5. Init layout manager
  const lm = new LayoutManager(win)
  layoutManager.manager = lm

  // 6. Register API routes
  registerRoutes(router, win, lm)

  // 7. Load renderer (dev mode)
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(resolve(__dirname, '../../packages/renderer/dist/index.html'))
  }

  // 8. Init account manager
  const accounts = new AccountManager()
  const savedAccounts = await accounts.list()
  for (const acc of savedAccounts) {
    if (acc.status === 'active') {
      createPlatformView(win, lm, acc.platform as PlatformType, acc.accountId)
    }
  }
}

// ========== Platform View Factory ==========

function createPlatformView(
  win: BaseWindow,
  lm: LayoutManager,
  platform: PlatformType,
  accountId: string,
) {
  const platformInfo = PLATFORMS[platform]
  const id = `${platform}_${accountId}`
  const partition = `persist:${platform}_${accountId}`
  const sess = session.fromPartition(partition)

  const view = new WebContentsView({
    webPreferences: {
      session: sess,
      contextIsolation: true,
      sandbox: false,
    },
  })

  // Inject interceptor at did-start-loading
  let injected = false
  view.webContents.on('did-start-loading', () => {
    if (injected) return
    injected = true
    const getCode = INTERCEPTORS[platform]
    if (getCode) {
      view.webContents.executeJavaScript(`
        (function() { ${getCode()} })(); true;
      `, { worldId: 0 })
    }
  })

  // Inject user scripts at did-finish-load
  view.webContents.on('did-finish-load', () => {
    const scriptManager = new ScriptManager()
    scriptManager.injectScripts(view, id, platform)
  })

  win.contentView.addChildView(view)
  view.webContents.loadURL(platformInfo.url)

  lm.addView(id, platform, accountId, { view })
}

// ========== API Routes ==========

function registerRoutes(router: ReturnType<typeof createRouter>, win: BaseWindow, lm: LayoutManager) {
  router.get('/api/views', () => {
    const snapshot = lm.getSnapshot()
    return new Response(JSON.stringify(snapshot), {
      headers: { 'content-type': 'application/json' },
    })
  })

  router.post('/api/views/create', (req) => {
    // Parse body and create view
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  })

  router.post('/api/views/hide', async (req) => {
    const body = await req.json() as any
    lm.hide(body.id)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  })

  router.post('/api/views/show', async (req) => {
    const body = await req.json() as any
    lm.show(body.id)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  })

  router.post('/api/views/layout', async (req) => {
    const body = await req.json() as any
    lm.setLayout(body.mode)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  })

  router.post('/api/views/resize', async (req) => {
    const body = await req.json() as any
    lm.resizeView(body.id, body.deltaX, body.deltaY)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  })
}

// ========== Lifecycle ==========

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // macOS: re-create window
  if (BaseWindow.getAllWindows().length === 0) {
    bootstrap()
  }
})

app.on('before-quit', () => {
  layoutManager.manager?.destroyAll()
})

// ========== Start ==========
bootstrap().catch((err) => {
  console.error('[MultiOp] Bootstrap failed:', err)
  process.exit(1)
})
