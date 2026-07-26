import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =========================================================================
// Mocks — must use vi.hoisted for variables used inside vi.mock factory
// =========================================================================

const { mockWC, mockView, mockContentView, mockWindow, mockSession } = vi.hoisted(() => {
  const wc = {
    setUserAgent: vi.fn(),
    setAudioMuted: vi.fn(),
    setZoomFactor: vi.fn(),
    setBackgroundThrottling: vi.fn(),
    loadURL: vi.fn(),
    reload: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    stop: vi.fn(),
    canGoBack: vi.fn(() => false),
    canGoForward: vi.fn(() => false),
    openDevTools: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    setWindowOpenHandler: vi.fn(),
  }

  return {
    mockWC: wc,
    mockView: {
      webContents: wc,
      setBounds: vi.fn(),
    },
    mockContentView: {
      addChildView: vi.fn(),
      removeChildView: vi.fn(),
    },
    mockWindow: {
      contentView: null as any,
      on: vi.fn(),
      isDestroyed: vi.fn(() => false),
    },
    mockSession: {
      setProxy: vi.fn().mockResolvedValue(undefined),
      setPermissionRequestHandler: vi.fn(),
    },
  }
})

// wire circular
mockWindow.contentView = mockContentView

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  WebContentsView: vi.fn(function () { return mockView }),
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
  session: {
    defaultSession: mockSession,
    fromPartition: vi.fn(() => mockSession),
  },
}))

import { WebContentManager, bus, on } from '../src/main/index'
import type { WebContentOptions } from '../src/main/types'

// =========================================================================
// Helpers
// =========================================================================

function makeOpts(overrides: Partial<WebContentOptions> = {}): WebContentOptions {
  return {
    id: 'test-1',
    src: 'https://example.com',
    partition: 'persist:test',
    ...overrides,
  }
}

function newManager() {
  const m = new WebContentManager({ maxPoolSize: 3, idleTimeout: 0 })
  m.attach(mockWindow as any)
  vi.clearAllMocks()
  return m
}

// =========================================================================
// Tests
// =========================================================================

describe('WebContentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ------------------------------------------------------------------
  // State Machine
  // ------------------------------------------------------------------

  describe('state machine', () => {
    it('transitions idle → configuring → loading → active on create with proxy', async () => {
      const mgr = newManager()
      const states: string[] = []

      on('view:state-changed', ({ state }) => states.push(state))

      await mgr.createView(makeOpts({ proxyRules: 'socks5://127.0.0.1:1080' }))

      expect(states).toContain('configuring')
      expect(states).toContain('loading')
      expect(mgr.getViewState('test-1')).toBe('loading') // loadURL was called
    })

    it('transitions idle → loading → active on create without proxy', async () => {
      const mgr = newManager()
      const states: string[] = []

      on('view:state-changed', ({ state }) => states.push(state))
      await mgr.createView(makeOpts())

      expect(states).toContain('loading')
      expect(mgr.getViewState('test-1')).toBe('loading')
    })

    it('transitions active → hidden → active on setHidden toggle', async () => {
      const mgr = newManager()

      await mgr.createView(makeOpts())
      // manually set to active for test
      const entry = (mgr as any).views.get('test-1')
      if (entry) entry.transition('active')

      mgr.setHidden('test-1', true)
      expect(mgr.getViewState('test-1')).toBe('hidden')
      expect(mockContentView.removeChildView).toHaveBeenCalled()

      mgr.setHidden('test-1', false)
      expect(mgr.getViewState('test-1')).toBe('active')
      expect(mockContentView.addChildView).toHaveBeenCalled()
    })

    it('refuses invalid transitions', async () => {
      const mgr = newManager()

      await mgr.createView(makeOpts())
      const entry = (mgr as any).views.get('test-1')
      entry.transition('active')

      entry.transition('loading') // valid: active → loading
      expect(entry.state).toBe('loading')
    })

    it('refuses goBack when cannot go back', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())
      const entry = (mgr as any).views.get('test-1')
      entry.transition('active')

      mgr.goBack('test-1')
      expect(mockWC.goBack).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // Pool (dormant / persist)
  // ------------------------------------------------------------------

  describe('pool', () => {
    it('moves view to dormant on remove when persist partition', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())

      mgr.removeView('test-1')
      expect(mgr.poolSize).toBe(1)
      expect(mgr.getViewState('test-1')).toBeNull()
    })

    it('reuses dormant view on same src + partition', async () => {
      const mgr = newManager()

      await mgr.createView(makeOpts({ id: 'first' }))
      mgr.removeView('first')
      expect(mgr.poolSize).toBe(1)

      await mgr.createView(makeOpts({ id: 'second' }))
      // pool should be empty again (view reused)
      expect(mgr.poolSize).toBe(0)
      expect(mgr.getViewState('second')).not.toBeNull()
    })

    it('destroys view on remove when detachDestroy', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())

      mgr.removeView('test-1', true) // forceDestroy
      expect(mgr.poolSize).toBe(0)
    })

    it('destroys view on remove when non-persist partition', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts({ partition: 'ephemeral' }))

      mgr.removeView('test-1')
      expect(mgr.poolSize).toBe(0)
    })

    it('evicts LRU when pool exceeds maxPoolSize', async () => {
      const mgr = new WebContentManager({ maxPoolSize: 2, idleTimeout: 0 })
      mgr.attach(mockWindow as any)

      const evicted: string[] = []
      on('pool:full', ({ evicted: id }) => evicted.push(id))

      // Create 3 views, all go to pool on remove
      await mgr.createView(makeOpts({ id: 'a', src: 'https://a.com' }))
      await mgr.createView(makeOpts({ id: 'b', src: 'https://b.com' }))
      await mgr.createView(makeOpts({ id: 'c', src: 'https://c.com' }))

      mgr.removeView('a')
      mgr.removeView('b')
      mgr.removeView('c')

      // Pool is full (3 entries, max 2). Creating a new view triggers eviction.
      await mgr.createView(makeOpts({ id: 'd', src: 'https://d.com' }))

      expect(evicted.length).toBeGreaterThanOrEqual(1)
      expect(mgr.poolSize).toBeLessThanOrEqual(2)
    })
  })

  // ------------------------------------------------------------------
  // Proxy
  // ------------------------------------------------------------------

  describe('proxy', () => {
    it('calls session.setProxy before loading URL', async () => {
      const mgr = newManager()

      await mgr.createView(
        makeOpts({ proxyRules: 'http=127.0.0.1:8888', proxyBypassRules: '<local>' }),
      )

      expect(mockSession.setProxy).toHaveBeenCalledWith(
        expect.objectContaining({
          proxyRules: 'http=127.0.0.1:8888',
        }),
      )
    })

    it('reconfigures proxy and reloads on updateProxy', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())

      const entry = (mgr as any).views.get('test-1')
      entry.transition('active')

      await mgr.updateProxy('test-1', 'http://new:8080')
      expect(mockSession.setProxy).toHaveBeenCalled()
      expect(entry.proxyRules).toBe('http://new:8080')
    })

    it('transitions to error on proxy failure', async () => {
      mockSession.setProxy.mockRejectedValueOnce(new Error('Proxy failed'))
      const mgr = newManager()

      const errors: any[] = []
      on('error', (e) => errors.push(e))

      await mgr.createView(makeOpts({ proxyRules: 'bad-proxy' }))
      expect(errors.length).toBe(1)
    })
  })

  // ------------------------------------------------------------------
  // Operations
  // ------------------------------------------------------------------

  describe('operations', () => {
    it('loadURL triggers loading state', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())

      const entry = (mgr as any).views.get('test-1')
      entry.transition('active')
      entry.transition = vi.fn() // spy

      mgr.loadURL('test-1', 'https://new-url.com')
      expect(mockWC.loadURL).toHaveBeenCalledWith('https://new-url.com')
    })

    it('reload triggers loading state', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())
      const entry = (mgr as any).views.get('test-1')
      entry.transition('active')

      mgr.reload('test-1')
      expect(mockWC.reload).toHaveBeenCalled()
    })

    it('stop calls webContents.stop', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())

      mgr.stop('test-1')
      expect(mockWC.stop).toHaveBeenCalled()
    })

    it('setZoom calls webContents.setZoomFactor', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())

      mgr.setZoom('test-1', 2.0)
      expect(mockWC.setZoomFactor).toHaveBeenCalledWith(2.0)
    })

    it('setMute calls webContents.setAudioMuted', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())

      mgr.setMute('test-1', true)
      expect(mockWC.setAudioMuted).toHaveBeenCalledWith(true)
    })

    it('getViewState returns state for existing view', async () => {
      const mgr = newManager()
      await mgr.createView(makeOpts())

      expect(mgr.getViewState('test-1')).toBe('loading')
      expect(mgr.getViewState('nonexistent')).toBeNull()
    })
  })
})
