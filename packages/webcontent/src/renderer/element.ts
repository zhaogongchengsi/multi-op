import { LitElement, html, css, type PropertyValues } from 'lit'
import { property, state } from 'lit/decorators.js'
import { getBridge, nextViewId } from './bridge'
import type { WebContentEvent } from '../main/types'

// =========================================================================
// Custom Events
// =========================================================================

const EVENTS = {
  LOAD:          'webcontent:load',
  ERROR:         'webcontent:error',
  TITLE_CHANGED: 'webcontent:title-changed',
  NAVIGATE:      'webcontent:navigate',
  STATE_CHANGED: 'webcontent:state-changed',
  PROXY_READY:   'webcontent:proxy-ready',
} as const

// =========================================================================
// <web-content> Element
// =========================================================================

export class WebContentElement extends LitElement {
  // ------------------------------------------------------------------
  // Observed Attributes
  // ------------------------------------------------------------------

  @property() src = ''
  @property() partition = ''
  @property({ type: Boolean, reflect: true }) hidden = false
  @property({ type: Boolean, reflect: true, attribute: 'detach-destroy' }) detachDestroy = false
  @property({ type: Boolean, reflect: true }) mute = false
  @property({ type: Boolean, reflect: true }) devtools = false
  @property({ attribute: 'proxy-rules' }) proxyRules = ''
  @property({ attribute: 'proxy-bypass' }) proxyBypass = ''
  @property({ type: Number, attribute: 'loading-timeout' }) loadingTimeout = 0
  @property({ attribute: 'allow-navigation' }) allowNavigation = ''
  @property() permissions = ''
  @property() preload = ''
  @property({ type: Number }) zoomfactor = 1
  @property() useragent = ''
  @property() httpreferrer = ''

  // ------------------------------------------------------------------
  // Reactive State
  // ------------------------------------------------------------------

  @state() private _viewId = ''
  @state() private _pageTitle = ''
  @state() private _currentURL = ''
  @state() private _errorCode = 0
  @state() private _errorDescription = ''
  @state() private _loading = false
  @state() private _viewState = 'idle'

  private _observer: ResizeObserver | null = null
  private _unsubEvent: (() => void) | null = null
  private _prevHidden = false

  // ------------------------------------------------------------------
  // Styles
  // ------------------------------------------------------------------

  static override styles = css`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background: var(--webcontent-bg, #fff);
      min-height: 100px;
      min-width: 100px;
    }

    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid var(--webcontent-spinner-track, #e0e0e0);
      border-top-color: var(--webcontent-spinner-color, #666);
      border-radius: 50%;
      animation: wc-spin 0.8s linear infinite;
    }

    @keyframes wc-spin {
      to { transform: rotate(360deg); }
    }

    .error-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: var(--webcontent-error-color, #c00);
      font-size: 13px;
      background: var(--webcontent-error-bg, rgba(255,255,255,0.95));
      padding: 16px;
      border-radius: 8px;
    }

    .error-box button {
      cursor: pointer;
      padding: 4px 12px;
      border: 1px solid currentColor;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      font-size: inherit;
    }

    .info-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 0;
      overflow: hidden;
    }
  `

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback()
    this._viewId = this.id || nextViewId()
    this._prevHidden = this.hidden

    const bridge = getBridge()
    if (!bridge) {
      console.warn('[webcontent] bridge not initialised – call initBridge() first.')
      return
    }

    this._create(bridge)
    this._startObserving(bridge)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this._teardown(this.detachDestroy)
  }

  protected override updated(changed: PropertyValues): void {
    const bridge = getBridge()
    if (!bridge || !this._viewId) return

    // src change
    if (changed.has('src') && this.src) {
      bridge.loadURL(this._viewId, this.src)
    }

    // zoom change
    if (changed.has('zoomfactor')) {
      bridge.setZoom(this._viewId, this.zoomfactor)
    }

    // hidden toggle
    if (changed.has('hidden') && this.hidden !== this._prevHidden) {
      this._prevHidden = this.hidden
      bridge.setHidden(this._viewId, this.hidden)
      this._loading = false
    }

    // mute toggle
    if (changed.has('mute')) {
      bridge.setMute(this._viewId, this.mute)
    }

    // proxy change
    if ((changed.has('proxyRules') || changed.has('proxyBypass')) && this.proxyRules) {
      bridge.updateProxy(this._viewId, this.proxyRules, this.proxyBypass || undefined)
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  override render() {
    return html`
      <slot></slot>
      ${this._renderOverlay()}
    `
  }

  private _renderOverlay() {
    if (this._errorCode) {
      return html`
        <div class="overlay">
          <div class="error-box">
            <span>${this._errorDescription || `Error ${this._errorCode}`}</span>
            <button @click=${this._retry}>Retry</button>
          </div>
        </div>
      `
    }

    const loadingStates = new Set(['idle', 'configuring', 'loading'])
    if (loadingStates.has(this._viewState) || this._loading) {
      return html`<div class="overlay"><div class="spinner"></div></div>`
    }

    return null
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  navigate(url: string): void { this.src = url }
  reloadView(): void { getBridge()?.reload(this._viewId) }
  goBack(): void { getBridge()?.goBack(this._viewId) }
  goForward(): void { getBridge()?.goForward(this._viewId) }
  stopLoading(): void { getBridge()?.stop(this._viewId) }
  show(): void { this.hidden = false }
  hide(): void { this.hidden = true }

  get viewId(): string { return this._viewId }
  get pageTitle(): string { return this._pageTitle }
  get currentURL(): string { return this._currentURL }
  get viewState(): string { return this._viewState }
  get isLoading(): boolean { return this._loading }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private _create(bridge: NonNullable<ReturnType<typeof getBridge>>): void {
    bridge.create({
      id: this._viewId,
      src: this.src || undefined,
      partition: this.partition || undefined,
      preload: this.preload || undefined,
      zoomFactor: this.zoomfactor > 0 ? this.zoomfactor : undefined,
      userAgent: this.useragent || undefined,
      httpReferrer: this.httpreferrer || undefined,
      proxyRules: this.proxyRules || undefined,
      proxyBypassRules: this.proxyBypass || undefined,
      loadingTimeout: this.loadingTimeout > 0 ? this.loadingTimeout : undefined,
      allowNavigation: this.allowNavigation || undefined,
      permissions: this.permissions || undefined,
      mute: this.mute || undefined,
      devtools: this.devtools || undefined,
    })

    this._loading = true

    this._unsubEvent = bridge.onEvent(event => {
      if (event.id !== this._viewId) return
      this._handleEvent(event)
    })

    // initial bounds
    this._syncBounds(bridge)

    // initial hidden
    if (this.hidden) {
      bridge.setHidden(this._viewId, true)
    }
  }

  private _handleEvent(event: WebContentEvent): void {
    switch (event.type) {
      case 'did-navigate':
        this._currentURL = event.url
        this.dispatchCustomEvent(EVENTS.NAVIGATE, { url: event.url })
        break
      case 'title-updated':
        this._pageTitle = event.title
        this.dispatchCustomEvent(EVENTS.TITLE_CHANGED, { title: event.title })
        document.title = event.title // mirror to document
        break
      case 'did-finish-load':
        this._loading = false
        this._errorCode = 0
        this._errorDescription = ''
        if (!this.hidden) {
          this.dispatchCustomEvent(EVENTS.LOAD, {})
        }
        break
      case 'did-fail-load':
        this._loading = false
        this._errorCode = event.errorCode
        this._errorDescription = event.errorDescription
        this.dispatchCustomEvent(EVENTS.ERROR, {
          errorCode: event.errorCode,
          errorDescription: event.errorDescription,
        })
        break
      case 'state-changed':
        this._viewState = event.state
        this.dispatchCustomEvent(EVENTS.STATE_CHANGED, { state: event.state })
        break
      case 'proxy-configured':
        this.dispatchCustomEvent(EVENTS.PROXY_READY, {})
        break
    }
  }

  private _syncBounds(bridge: NonNullable<ReturnType<typeof getBridge>>): void {
    const rect = this.getBoundingClientRect()
    bridge.setBounds(this._viewId, {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    })
  }

  private _startObserving(bridge: NonNullable<ReturnType<typeof getBridge>>): void {
    this._observer = new ResizeObserver(() => this._syncBounds(bridge))
    this._observer.observe(this)
  }

  private _retry(): void {
    this._errorCode = 0
    this._errorDescription = ''
    if (this.src) getBridge()?.loadURL(this._viewId, this.src)
  }

  private _teardown(detachDestroy: boolean): void {
    this._observer?.disconnect()
    this._observer = null
    this._unsubEvent?.()
    this._unsubEvent = null
    if (this._viewId) getBridge()?.remove(this._viewId, detachDestroy)
  }

  private dispatchCustomEvent<T extends Record<string, unknown>>(
    name: string,
    detail: T,
  ): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }))
  }
}
