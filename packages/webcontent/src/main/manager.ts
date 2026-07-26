import { BrowserWindow, ipcMain, WebContentsView, session as electronSession } from 'electron'
import {
  ALLOWED_TRANSITIONS,
  OPERATION_STATES,
  type BoundsRect,
  type ManagerOptions,
  type ViewState,
  type WebContentOptions,
  webContentProtocol,
  ZManagerOptions,
  ZWebContentOptions,
} from './types'
import { bus } from './events'

// =========================================================================
// ViewEntry
// =========================================================================

let _poolSeq = 0

class ViewEntry {
  id: string
  readonly view: WebContentsView
  readonly partition: string
  readonly src: string

  private _state: ViewState = 'idle'
  private _poolOrder = 0
  private _idleTimer: ReturnType<typeof setTimeout> | null = null
  private _loadingTimer: ReturnType<typeof setTimeout> | null = null
  private _loadingTimeout = 0
  private _proxyRules: string | null = null
  private _proxyBypassRules: string | null = null
  private _allowNavigation: string | null = null

  constructor(
    id: string,
    view: WebContentsView,
    opts: WebContentOptions,
  ) {
    this.id = id
    this.view = view
    this.partition = opts.partition ?? ''
    this.src = opts.src ?? ''
    this._poolOrder = 0
    this._loadingTimeout = opts.loadingTimeout ?? 0
    this._proxyRules = opts.proxyRules ?? null
    this._proxyBypassRules = opts.proxyBypassRules ?? null
    this._allowNavigation = opts.allowNavigation ?? null
  }

  // -- state --
  get state(): ViewState { return this._state }

  transition(next: ViewState): boolean {
    const allowed = ALLOWED_TRANSITIONS[this._state]
    if (!allowed?.has(next)) {
      console.warn(
        `[WebContent] Invalid transition: "${this._state}" → "${next}" (view ${this.id})`,
      )
      return false
    }
    const prev = this._state
    this._state = next
    bus.emit('view:state-changed', { id: this.id, state: next, prevState: prev })
    return true
  }

  canAccept(method: string): boolean {
    return OPERATION_STATES[method]?.has(this._state) ?? false
  }

  // -- pool ordering --
  get poolOrder(): number { return this._poolOrder }
  touchPool(): void { this._poolOrder = ++_poolSeq }

  // -- idle timer --
  startIdleTimer(timeout: number, onExpire: () => void): void {
    this.clearIdleTimer()
    this._idleTimer = setTimeout(onExpire, timeout)
  }
  clearIdleTimer(): void {
    if (this._idleTimer) { clearTimeout(this._idleTimer); this._idleTimer = null }
  }

  // -- loading timeout --
  startLoadingTimer(onTimeout: () => void): void {
    this.clearLoadingTimer()
    if (this._loadingTimeout > 0) {
      this._loadingTimer = setTimeout(onTimeout, this._loadingTimeout)
    }
  }
  clearLoadingTimer(): void {
    if (this._loadingTimer) { clearTimeout(this._loadingTimer); this._loadingTimer = null }
  }

  // -- proxy --
  get proxyRules(): string | null { return this._proxyRules }
  get proxyBypassRules(): string | null { return this._proxyBypassRules }
  setProxy(rules: string | null, bypassRules: string | null): void {
    this._proxyRules = rules
    this._proxyBypassRules = bypassRules
  }

  // -- allowlist --
  get allowNavigation(): string | null { return this._allowNavigation }
  setAllowNavigation(pattern: string | null): void {
    this._allowNavigation = pattern
  }

  /** Convert a glob-like pattern to a regex for URL matching. */
  matchesAllowNavigation(url: string): boolean {
    if (!this._allowNavigation) return true
    const regex = new RegExp(
      '^' + this._allowNavigation.replace(/\*/g, '.*') + '$',
    )
    return regex.test(url)
  }
}

// =========================================================================
// WebContentManager
// =========================================================================

export class WebContentManager {
  private views = new Map<string, ViewEntry>()
  /** dormant pool: key = `${partition}::${src}` → entry */
  private pool = new Map<string, ViewEntry>()
  /** Maps view ID → host window WebContents for IPC event forwarding. */
  private _eventForwarders = new Map<string, Electron.WebContents>()
  private window: BrowserWindow | null = null
  private maxPoolSize: number
  private idleTimeout: number

  constructor(opts: ManagerOptions = {}) {
    const parsed = ZManagerOptions.parse(opts)
    this.maxPoolSize = parsed.maxPoolSize
    this.idleTimeout = parsed.idleTimeout
  }

  /** Public event bus (mitt). */
  readonly events = bus

  // ==================================================================
  // Lifecycle
  // ==================================================================

  attach(window: BrowserWindow): void {
    if (this.window) this.detach()
    this.window = window
    window.on('closed', () => this.detach())
    this.registerIPC()
  }

  detach(): void {
    for (const id of this.views.keys()) this.removeView(id, true)
    for (const key of this.pool.keys()) {
      const entry = this.pool.get(key)!
      this.destroyView(entry)
      this.pool.delete(key)
    }
    this.window = null
  }

  // ==================================================================
  // View Operations
  // ==================================================================

  async createView(options: WebContentOptions): Promise<void> {
    if (!this.window) return

    const parsed = ZWebContentOptions.safeParse(options)
    if (!parsed.success) {
      console.error('[WebContent] Invalid options:', parsed.error.flatten())
      return
    }
    const opts = parsed.data

    // -- check pool first --
    const poolKey = this.poolKey(opts)
    const pooled = this.pool.get(poolKey)
    if (pooled && opts.partition?.startsWith('persist:')) {
      this.pool.delete(poolKey)
      pooled.id = opts.id
      // Transfer any existing forwarder from the create IPC handler
      const fwd = this._eventForwarders.get(opts.id)
      pooled.transition('active')
      pooled.clearIdleTimer()
      pooled.touchPool()
      this.views.set(opts.id, pooled)
      this.window.contentView.addChildView(pooled.view)
      this.syncBounds(pooled)
      bus.emit('view:created', { id: pooled.id })
      return
    }

    // -- evict if pool full --
    this.evictPoolIfNeeded()

    // -- clean previous --
    if (this.views.has(opts.id)) this.removeView(opts.id, true)

    // -- create --
    const view = new WebContentsView({
      webPreferences: {
        preload: opts.preload,
        partition: opts.partition,
      },
    })

    if (opts.userAgent) view.webContents.setUserAgent(opts.userAgent)
    if (opts.mute) view.webContents.setAudioMuted(true)
    if (opts.zoomFactor) view.webContents.setZoomFactor(opts.zoomFactor)

    const entry = new ViewEntry(opts.id, view, opts)
    this.views.set(opts.id, entry)
    this.wireViewEvents(entry)

    // devtools
    if (opts.devtools) view.webContents.openDevTools()

    // permissions
    if (opts.permissions) this.setupPermissions(entry, opts.permissions)

    // proxy
    if (opts.proxyRules) {
      entry.transition('configuring')
      bus.emit('view:created', { id: opts.id })
      try {
        await this.applyProxy(entry, opts.proxyRules, opts.proxyBypassRules)
        entry.transition('loading')
      } catch (err) {
        entry.transition('error')
        bus.emit('error', { id: opts.id, error: err as Error })
        return
      }
    } else {
      entry.transition('loading')
    }

    this.window.contentView.addChildView(view)
    bus.emit('view:created', { id: opts.id })

    // load
    if (opts.src) {
      entry.startLoadingTimer(() => this.onLoadingTimeout(entry))
      view.webContents.loadURL(opts.src, { httpReferrer: opts.httpReferrer })
    }
  }

  removeView(id: string, forceDestroy = false): void {
    const entry = this.views.get(id)
    if (!entry) return
    this.views.delete(id)
    this._eventForwarders.delete(id)

    if (this.window && !this.window.isDestroyed()) {
      this.window.contentView.removeChildView(entry.view)
    }

    // persist → dormant pool
    if (!forceDestroy && entry.partition.startsWith('persist:')) {
      const key = this.poolKey({ partition: entry.partition, src: entry.src })
      // Move existing pool entry to dormant before replacing
      const existing = this.pool.get(key)
      if (existing) this.destroyView(existing)

      entry.touchPool()
      entry.transition('dormant')
      this.pool.set(key, entry)

      if (this.idleTimeout > 0) {
        entry.startIdleTimer(this.idleTimeout, () => {
          this.pool.delete(key)
          this.destroyView(entry)
          bus.emit('pool:idle-expired', { id: entry.id })
        })
      }
      bus.emit('view:removed', { id: entry.id })
      return
    }

    this.destroyView(entry)
    bus.emit('view:removed', { id: entry.id })
  }

  /** Handle hidden attribute toggle. */
  setHidden(id: string, hidden: boolean): void {
    const entry = this.views.get(id)
    if (!entry) return

    if (hidden && entry.state === 'active') {
      if (this.window && !this.window.isDestroyed()) {
        this.window.contentView.removeChildView(entry.view)
      }
      entry.transition('hidden')
      entry.view.webContents.setBackgroundThrottling(true)
    } else if (!hidden && entry.state === 'hidden') {
      if (this.window && !this.window.isDestroyed()) {
        this.window.contentView.addChildView(entry.view)
        this.syncBounds(entry)
      }
      entry.transition('active')
      entry.view.webContents.setBackgroundThrottling(false)
    }
  }

  setBounds(id: string, bounds: BoundsRect): void {
    const entry = this.views.get(id)
    if (!entry?.canAccept('setBounds')) return
    entry.view.setBounds(bounds)
  }

  loadURL(id: string, url: string): void {
    const entry = this.views.get(id)
    if (!entry?.canAccept('loadURL')) return
    entry.transition('loading')
    entry.startLoadingTimer(() => this.onLoadingTimeout(entry))
    entry.view.webContents.loadURL(url)
  }

  reload(id: string): void {
    const entry = this.views.get(id)
    if (!entry?.canAccept('reload')) return
    entry.transition('loading')
    entry.startLoadingTimer(() => this.onLoadingTimeout(entry))
    entry.view.webContents.reload()
  }

  goBack(id: string): void {
    const entry = this.views.get(id)
    if (!entry?.canAccept('goBack') || !entry.view.webContents.canGoBack()) return
    entry.transition('loading')
    entry.view.webContents.goBack()
  }

  goForward(id: string): void {
    const entry = this.views.get(id)
    if (!entry?.canAccept('goForward') || !entry.view.webContents.canGoForward()) return
    entry.transition('loading')
    entry.view.webContents.goForward()
  }

  stop(id: string): void {
    const entry = this.views.get(id)
    if (!entry?.canAccept('stop')) return
    entry.view.webContents.stop()
  }

  setZoom(id: string, factor: number): void {
    const entry = this.views.get(id)
    if (!entry?.canAccept('setZoom')) return
    entry.view.webContents.setZoomFactor(factor)
  }

  setMute(id: string, mute: boolean): void {
    this.views.get(id)?.view.webContents.setAudioMuted(mute)
  }

  /** Capture a screenshot of the view as a base64 data URL. */
  async captureScreenshot(id: string): Promise<string> {
    const entry = this.views.get(id) ?? this.pool.get(id)
    if (!entry) throw new Error(`View ${id} not found`)
    const image = await entry.view.webContents.capturePage()
    return image.toDataURL()
  }

  /** Update proxy rules for an existing view. Triggers configuring → loading → active. */
  async updateProxy(id: string, rules: string, bypassRules?: string): Promise<void> {
    const entry = this.views.get(id)
    if (!entry?.canAccept('configureProxy')) return

    entry.setProxy(rules, bypassRules ?? null)
    entry.transition('configuring')
    bus.emit('view:proxy-configured', { id, rules })
    try {
      await this.applyProxy(entry, rules, bypassRules)
      entry.transition('loading')
      entry.view.webContents.reload()
    } catch (err) {
      entry.transition('error')
      bus.emit('error', { id, error: err as Error })
    }
  }

  getViewState(id: string): ViewState | null {
    return this.views.get(id)?.state ?? null
  }

  // ==================================================================
  // Pool
  // ==================================================================

  get poolSize(): number { return this.pool.size }

  /** Manually clear a pooled view by key. */
  evictPool(key: string): void {
    const entry = this.pool.get(key)
    if (!entry) return
    this.pool.delete(key)
    this.destroyView(entry)
  }

  private poolKey(opts: { partition?: string; src?: string }): string {
    return `${opts.partition ?? ''}::${opts.src ?? ''}`
  }

  private evictPoolIfNeeded(): void {
    while (this.pool.size >= this.maxPoolSize) {
      // LRU: evict entry with smallest poolOrder
      let oldestKey = ''
      let oldestOrder = Infinity
      for (const [k, e] of this.pool) {
        if (e.poolOrder < oldestOrder) { oldestOrder = e.poolOrder; oldestKey = k }
      }
      if (oldestKey) {
        const entry = this.pool.get(oldestKey)!
        this.pool.delete(oldestKey)
        this.destroyView(entry)
        bus.emit('pool:full', { evicted: entry.id })
      }
    }
  }

  // ==================================================================
  // Proxy
  // ==================================================================

  private async applyProxy(
    entry: ViewEntry,
    rules: string,
    bypassRules?: string,
  ): Promise<void> {
    const partition = entry.partition || undefined
    const ses = partition
      ? electronSession.fromPartition(partition)
      : electronSession.defaultSession

    await ses.setProxy({
      proxyRules: rules,
      proxyBypassRules: bypassRules,
    })
  }

  // ==================================================================
  // Permissions
  // ==================================================================

  private setupPermissions(entry: ViewEntry, permissions: string): void {
    const allowed = new Set(permissions.split(',').map(s => s.trim()).filter(Boolean))
    if (allowed.size === 0) return

    const partition = entry.partition || undefined
    const ses = partition
      ? electronSession.fromPartition(partition)
      : electronSession.defaultSession

    ses.setPermissionRequestHandler(
      (_webContents, permission, callback) => {
        callback(allowed.has(permission))
      },
    )
  }

  // ==================================================================
  // Events wiring
  // ==================================================================

  private wireViewEvents(entry: ViewEntry): void {
    const wc = entry.view.webContents
    const fwd = (payload: Record<string, unknown>) => {
      const host = this._eventForwarders.get(entry.id)
      if (host && !host.isDestroyed()) {
        host.send('webcontent:event', payload)
      }
    }

    wc.on('did-navigate', (_e, url) => {
      entry.transition('active')
      entry.clearLoadingTimer()
      bus.emit('view:navigated', { id: entry.id, url })
      fwd({ type: 'did-navigate', id: entry.id, url })
    })

    wc.on('page-title-updated', (_e, title) => {
      bus.emit('view:title-updated', { id: entry.id, title })
      fwd({ type: 'title-updated', id: entry.id, title })
    })

    wc.on('did-finish-load', () => {
      entry.clearLoadingTimer()
      if (entry.state === 'loading') entry.transition('active')
      bus.emit('view:finish-load', { id: entry.id })
      fwd({ type: 'did-finish-load', id: entry.id })
    })

    wc.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
      entry.clearLoadingTimer()
      entry.transition('error')
      bus.emit('view:fail-load', { id: entry.id, url: validatedURL, errorCode, errorDescription })
      fwd({ type: 'did-fail-load', id: entry.id, url: validatedURL, errorCode, errorDescription })
    })

    // state changes
    bus.on('view:state-changed', (payload) => {
      if (payload.id === entry.id) fwd({ type: 'state-changed', id: payload.id, state: payload.state })
    })

    // proxy configured
    bus.on('view:proxy-configured', (payload) => {
      if (payload.id === entry.id) fwd({ type: 'proxy-configured', id: payload.id })
    })

    // navigation allowlist
    wc.on('will-navigate', (_e, url) => {
      if (!entry.matchesAllowNavigation(url)) {
        _e.preventDefault()
        // open externally
        const { shell } = require('electron')
        shell.openExternal(url).catch(() => {})
      }
    })

    // new-window → external
    wc.setWindowOpenHandler(({ url }) => {
      const { shell } = require('electron')
      shell.openExternal(url).catch(() => {})
      return { action: 'deny' }
    })
  }

  // ==================================================================
  // Internals
  // ==================================================================

  private onLoadingTimeout(entry: ViewEntry): void {
    entry.view.webContents.stop()
    entry.transition('error')
    bus.emit('view:fail-load', {
      id: entry.id,
      url: entry.src,
      errorCode: -7, // ABORTED
      errorDescription: `Loading timed out after ${entry['_loadingTimeout']}ms`,
    })
  }

  private destroyView(entry: ViewEntry): void {
    entry.clearIdleTimer()
    entry.clearLoadingTimer()
    entry.transition('closing')
    entry.view.webContents.close()
    entry.transition('closed')
  }

  private syncBounds(entry: ViewEntry): void {
    // bounds synced from renderer via IPC, no-op here
  }

  // ==================================================================
  // IPC
  // ==================================================================

  private registerIPC(): void {
    const p = webContentProtocol

    ipcMain.handle(p.create.name, async (event, options) => {
      // Track host window BEFORE createView so initial state-change
      // events are forwarded (not lost).
      const hostWC = event.sender
      const opts = options as WebContentOptions
      if (opts.id) {
        this._eventForwarders.set(opts.id, hostWC)
      }
      await this.createView(opts)
    })

    ipcMain.handle(p.remove.name, (_event, payload: { id: string; detachDestroy?: boolean }) => {
      this.removeView(payload.id, payload.detachDestroy)
    })

    ipcMain.handle(p.loadURL.name, (_event, payload: { id: string; url: string }) => {
      this.loadURL(payload.id, payload.url)
    })

    ipcMain.handle(p.setBounds.name, (_event, payload: { id: string; bounds: BoundsRect }) => {
      this.setBounds(payload.id, payload.bounds)
    })

    ipcMain.handle(p.reload.name, (_event, id: string) => { this.reload(id) })
    ipcMain.handle(p.goBack.name, (_event, id: string) => { this.goBack(id) })
    ipcMain.handle(p.goForward.name, (_event, id: string) => { this.goForward(id) })
    ipcMain.handle(p.stop.name, (_event, id: string) => { this.stop(id) })

    ipcMain.handle(p.setZoom.name, (_event, payload: { id: string; factor: number }) => {
      this.setZoom(payload.id, payload.factor)
    })

    ipcMain.handle(
      p.setHidden.name,
      (_event, payload: { id: string; hidden: boolean }) => {
        this.setHidden(payload.id, payload.hidden)
      },
    )

    ipcMain.handle(
      p.updateProxy.name,
      async (_event, payload: { id: string; rules: string; bypassRules?: string }) => {
        await this.updateProxy(payload.id, payload.rules, payload.bypassRules)
      },
    )

    ipcMain.handle(
      p.setMute.name,
      (_event, payload: { id: string; mute: boolean }) => {
        this.setMute(payload.id, payload.mute)
      },
    )

    ipcMain.handle(
      p.capture.name,
      async (_event, payload: { id: string }) => {
        const dataUrl = await this.captureScreenshot(payload.id)
        return { dataUrl }
      },
    )
  }
}
