import { BaseWindow, WebContentsView, session as electronSession } from 'electron'
import type { LayoutSnapshot, LayoutMode, PlatformType, ViewPhase } from '@multi-op/shared'
import { IPC_CHANNELS, PLATFORMS } from '@multi-op/shared'

interface ManagedView {
  id: string
  platform: PlatformType
  accountId: string
  view: WebContentsView
  phase: ViewPhase
  bounds: { x: number; y: number; width: number; height: number }
  state: 'normal' | 'minimized' | 'maximized' | 'hidden'
  order: number
  flexGrow: number
  minWidth: number
  minHeight: number
  createdAt: number
}

export class LayoutManager {
  private win: BaseWindow
  private views = new Map<string, ManagedView>()
  private currentLayout: LayoutMode = 'tile'
  private destroyTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private activeTab: string | null = null

  constructor(win: BaseWindow) {
    this.win = win
    win.on('resize', () => this.relayout())
  }

  // ========== View Management ==========

  addView(
    id: string,
    platform: PlatformType,
    accountId: string,
    options?: Partial<ManagedView>,
  ) {
    const platformInfo = PLATFORMS[platform]
    const partition = `persist:${platform}_${accountId}`
    const sess = electronSession.fromPartition(partition)

    const view = new WebContentsView({
      webPreferences: {
        preload: /* 由 desktop 注入 preload 路径 */ undefined,
        session: sess,
        contextIsolation: true,
        sandbox: false,
      },
    })

    this.win.contentView.addChildView(view)

    const managed: ManagedView = {
      id,
      platform,
      accountId,
      view,
      phase: 'creating',
      bounds: { x: 0, y: 0, width: 400, height: 300 },
      state: 'normal',
      order: this.views.size,
      flexGrow: 1,
      minWidth: 300,
      minHeight: 200,
      createdAt: Date.now(),
      ...options,
    }

    this.views.set(id, managed)

    // 生命周期事件绑定
    const wc = view.webContents
    wc.on('did-start-loading', () => this.setPhase(id, 'loading'))
    wc.on('dom-ready', () => this.setPhase(id, 'intercepted'))
    wc.on('did-finish-load', () => this.setPhase(id, 'ready'))
    wc.on('destroyed', () => this.setPhase(id, 'destroyed'))

    // 加载 URL
    view.webContents.loadURL(platformInfo.url)

    this.relayout()
    return managed
  }

  removeView(id: string) {
    const v = this.views.get(id)
    if (!v) return
    clearTimeout(this.destroyTimers.get(id))
    this.win.contentView.removeChildView(v.view)
    if (!v.view.webContents.isDestroyed()) {
      v.view.webContents.close()
    }
    this.views.delete(id)
    this.relayout()
  }

  // ========== Visibility ==========

  hide(id: string) {
    const v = this.views.get(id)
    if (!v) return

    v.state = 'hidden'
    v.view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    v.view.webContents.setVisible(false)

    // 30s 后销毁释放内存
    this.destroyTimers.set(
      id,
      setTimeout(() => {
        if (v.state === 'hidden' && !v.view.webContents.isDestroyed()) {
          v.view.webContents.close()
        }
      }, 30000),
    )
  }

  show(id: string) {
    const v = this.views.get(id)
    if (!v) return

    clearTimeout(this.destroyTimers.get(id))

    if (v.view.webContents.isDestroyed()) {
      // 重新创建 webContents 并加载
      const platformInfo = PLATFORMS[v.platform]
      v.view.webContents.loadURL(platformInfo.url)
    }

    v.state = 'normal'
    v.view.webContents.setVisible(true)
    this.relayout()

    // focus
    this.win.contentView.removeChildView(v.view)
    this.win.contentView.addChildView(v.view)
    v.view.webContents.focus()
  }

  focus(id: string) {
    const v = this.views.get(id)
    if (!v) return
    this.win.contentView.removeChildView(v.view)
    this.win.contentView.addChildView(v.view)
    v.view.webContents.focus()
  }

  // ========== Layout ==========

  setLayout(mode: LayoutMode) {
    this.currentLayout = mode
    this.relayout()
  }

  private relayout() {
    const { width, height } = this.win.getContentBounds()
    const activeViews = Array.from(this.views.values()).filter(
      (v) => v.state !== 'hidden',
    )

    switch (this.currentLayout) {
      case 'tile':
        this.layoutTile(activeViews, width, height)
        break
      case 'grid':
        this.layoutGrid(activeViews, width, height)
        break
      case 'stack':
        this.layoutStack(activeViews, width, height)
        break
      case 'free':
        break // 拖拽模式，不自动排列
    }

    this.notifyUI()
  }

  private layoutTile(views: ManagedView[], totalW: number, totalH: number) {
    if (views.length === 0) return
    const vw = totalW / views.length
    views.forEach((v, i) => {
      v.bounds = { x: i * vw, y: 0, width: vw, height: totalH }
      v.view.setBounds(v.bounds)
    })
  }

  private layoutGrid(views: ManagedView[], totalW: number, totalH: number) {
    const count = views.length
    if (count === 0) return
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    const vw = totalW / cols
    const vh = totalH / rows
    views.forEach((v, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      v.bounds = { x: col * vw, y: row * vh, width: vw, height: vh }
      v.view.setBounds(v.bounds)
    })
  }

  private layoutStack(views: ManagedView[], totalW: number, totalH: number) {
    const tabHeight = 40
    views.forEach((v) => {
      if (v.id === this.activeTab) {
        v.view.setBounds({ x: 0, y: tabHeight, width: totalW, height: totalH - tabHeight })
        v.view.webContents.setVisible(true)
      } else {
        v.view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
        v.view.webContents.setVisible(false)
      }
    })
  }

  switchTab(tabId: string) {
    this.activeTab = tabId
    this.relayout()
  }

  // ========== Resize ==========

  resizeView(id: string, deltaX: number, deltaY: number) {
    // 由拖拽分割线触发
    const v = this.views.get(id)
    if (!v) return

    // 简单的相邻调整逻辑
    const newWidth = Math.max(v.minWidth, v.bounds.width + deltaX)
    const newHeight = Math.max(v.minHeight, v.bounds.height + deltaY)
    v.bounds = { ...v.bounds, width: newWidth, height: newHeight }
    v.view.setBounds(v.bounds)
  }

  // ========== Snapshot ==========

  getSnapshot(): LayoutSnapshot {
    return {
      mode: this.currentLayout,
      views: Array.from(this.views.values()).map((v) => ({
        id: v.id,
        platform: v.platform,
        accountId: v.accountId,
        bounds: { ...v.bounds },
        state: v.state,
        order: v.order,
        flexGrow: v.flexGrow,
      })),
    }
  }

  applySnapshot(snapshot: LayoutSnapshot) {
    this.currentLayout = snapshot.mode
    // views will be restored by view manager
  }

  destroyAll() {
    for (const [id, v] of this.views) {
      clearTimeout(this.destroyTimers.get(id))
      if (!v.view.webContents.isDestroyed()) {
        v.view.webContents.close()
      }
    }
    this.views.clear()
    this.destroyTimers.clear()
  }

  // ========== Internal ==========

  private setPhase(id: string, phase: ViewPhase) {
    const v = this.views.get(id)
    if (!v) return
    v.phase = phase
    this.win.webContents.send(IPC_CHANNELS.VIEW_PHASE, { id, phase })
  }

  private notifyUI() {
    const data = Array.from(this.views.values()).map((v) => ({
      id: v.id,
      platform: v.platform,
      accountId: v.accountId,
      phase: v.phase,
      state: v.state,
    }))
    this.win.webContents.send(IPC_CHANNELS.VIEW_LAYOUT, { views: data })
  }
}
