import { app, BaseWindow, WebContentsView, session } from 'electron'
import { resolve } from 'node:path'
import { createRouter, LayoutManager, AccountManager, ScriptManager } from '@multi-op/core'
import { migrateDb } from '@multi-op/database'
import { SCHEME, PLATFORMS } from '@multi-op/shared'
import type { PlatformType } from '@multi-op/shared'
import { getInterceptorCode as tgInterceptor } from '@multi-op/adapter-telegram'
import { getInterceptorCode as waInterceptor } from '@multi-op/adapter-whatsapp'
import { getInterceptorCode as twInterceptor } from '@multi-op/adapter-twitter'

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
  router.registerPrivileged()

  await app.whenReady()

  await migrateDb()

  const win = new BaseWindow({
    width: 1200,
    height: 800,
    title: 'MultiOp',
    webPreferences: {
      preload: resolve(__dirname, '../packages/preload/src/index.ts'),
      contextIsolation: true,
      sandbox: false,
    },
  })

  router.registerToSession()

  const lm = new LayoutManager(win)
  layoutManager.manager = lm

  registerRoutes(router, win, lm)

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(resolve(__dirname, '../packages/renderer/dist/index.html'))
  }

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
  if (BaseWindow.getAllWindows().length === 0) {
    bootstrap()
  }
})

app.on('before-quit', () => {
  layoutManager.manager?.destroyAll()
})

bootstrap().catch((err) => {
  console.error('[MultiOp] Bootstrap failed:', err)
  process.exit(1)
})
