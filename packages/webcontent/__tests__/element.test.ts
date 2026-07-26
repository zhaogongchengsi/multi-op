/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =========================================================================
// Setup mock bridge BEFORE importing the element
// =========================================================================

// ResizeObserver polyfill for jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any

import { initBridge, type WebContentBridge } from '../src/renderer/bridge'

const mockBridge: WebContentBridge = {
  create: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  loadURL: vi.fn().mockResolvedValue(undefined),
  setBounds: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined),
  goBack: vi.fn().mockResolvedValue(undefined),
  goForward: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  setZoom: vi.fn().mockResolvedValue(undefined),
  setHidden: vi.fn().mockResolvedValue(undefined),
  setMute: vi.fn().mockResolvedValue(undefined),
  updateProxy: vi.fn().mockResolvedValue(undefined),
  onEvent: vi.fn().mockReturnValue(vi.fn()),
}

initBridge(mockBridge)

// Now import element — bridge is already set
import { registerWebContentElement } from '../src/renderer/register'
import { WebContentElement } from '../src/renderer/element'

// Register the custom element in jsdom
registerWebContentElement()

// =========================================================================
// Helpers
// =========================================================================

function createElement(attrs: Record<string, string> = {}): WebContentElement {
  const el = document.createElement('web-content') as WebContentElement
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v)
  }
  document.body.appendChild(el)
  return el
}

// =========================================================================
// Tests
// =========================================================================

describe('WebContentElement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  describe('lifecycle', () => {
    it('calls bridge.create with correct options on connected', async () => {
      createElement({ src: 'https://example.com', partition: 'persist:test' })

      await vi.waitFor(() => {
        expect(mockBridge.create).toHaveBeenCalledWith(
          expect.objectContaining({ src: 'https://example.com', partition: 'persist:test' }),
        )
      })
    })

    it('calls bridge.remove on disconnect', async () => {
      const el = createElement({ src: 'https://example.com' })

      await vi.waitFor(() => expect(mockBridge.create).toHaveBeenCalled())
      mockBridge.create.mockClear()

      el.remove()
      await vi.waitFor(() => {
        expect(mockBridge.remove).toHaveBeenCalled()
      })
    })

    it('generates unique id on connect', async () => {
      createElement()
      createElement()

      await vi.waitFor(() => expect(mockBridge.create).toHaveBeenCalledTimes(2))

      const id1 = (mockBridge.create as any).mock.calls[0][0]?.id
      const id2 = (mockBridge.create as any).mock.calls[1][0]?.id
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
    })
  })

  // ------------------------------------------------------------------
  // Hidden
  // ------------------------------------------------------------------

  describe('hidden', () => {
    it('calls bridge.setHidden(true) when hidden attribute added', async () => {
      const el = createElement()
      await vi.waitFor(() => expect(mockBridge.create).toHaveBeenCalled())
      mockBridge.create.mockClear()

      el.setAttribute('hidden', '')
      await Promise.resolve()

      expect(mockBridge.setHidden).toHaveBeenCalledWith(expect.any(String), true)
    })

    it('calls bridge.setHidden(false) when hidden attribute removed', async () => {
      const el = createElement({ hidden: '' })
      await vi.waitFor(() => expect(mockBridge.create).toHaveBeenCalled())
      mockBridge.create.mockClear()

      el.removeAttribute('hidden')
      await Promise.resolve()

      expect(mockBridge.setHidden).toHaveBeenCalledWith(expect.any(String), false)
    })
  })

  // ------------------------------------------------------------------
  // Mute
  // ------------------------------------------------------------------

  describe('mute', () => {
    it('calls bridge.setMute on attribute change', async () => {
      const el = createElement()
      await vi.waitFor(() => expect(mockBridge.create).toHaveBeenCalled())
      mockBridge.create.mockClear()

      el.setAttribute('mute', '')
      await Promise.resolve()

      expect(mockBridge.setMute).toHaveBeenCalledWith(expect.any(String), true)
    })
  })

  // ------------------------------------------------------------------
  // Detach destroy
  // ------------------------------------------------------------------

  describe('detach-destroy', () => {
    it('passes false for detachDestroy to bridge.remove by default', async () => {
      const el = createElement({ src: 'https://example.com' })
      await vi.waitFor(() => expect(mockBridge.create).toHaveBeenCalled())

      el.remove()
      await vi.waitFor(() => {
        expect(mockBridge.remove).toHaveBeenCalledWith(expect.any(String), false)
      })
    })

    it('passes true for detachDestroy when detach-destroy attr set', async () => {
      const el = createElement({ src: 'https://example.com', 'detach-destroy': '' })
      await vi.waitFor(() => expect(mockBridge.create).toHaveBeenCalled())

      el.remove()
      await vi.waitFor(() => {
        expect(mockBridge.remove).toHaveBeenCalledWith(expect.any(String), true)
      })
    })
  })

  // ------------------------------------------------------------------
  // Proxy
  // ------------------------------------------------------------------

  describe('proxy', () => {
    it('passes proxyOptions to create', async () => {
      createElement({
        src: 'https://example.com',
        'proxy-rules': 'socks5://localhost:1080',
        'proxy-bypass': '<local>',
      })

      await vi.waitFor(() => {
        expect(mockBridge.create).toHaveBeenCalledWith(
          expect.objectContaining({
            proxyRules: 'socks5://localhost:1080',
            proxyBypassRules: '<local>',
          }),
        )
      })
    })

    it('calls bridge.updateProxy when proxy-rules changes', async () => {
      const el = createElement({ src: 'https://example.com' })
      await vi.waitFor(() => expect(mockBridge.create).toHaveBeenCalled())
      mockBridge.create.mockClear()

      el.setAttribute('proxy-rules', 'http://new:8080')
      await Promise.resolve()

      expect(mockBridge.updateProxy).toHaveBeenCalledWith(
        expect.any(String),
        'http://new:8080',
        undefined,
      )
    })
  })

  // ------------------------------------------------------------------
  // Zoom
  // ------------------------------------------------------------------

  describe('zoom', () => {
    it('passes zoomFactor to create', async () => {
      createElement({ src: 'https://example.com', zoomfactor: '1.5' })

      await vi.waitFor(() => {
        expect(mockBridge.create).toHaveBeenCalledWith(
          expect.objectContaining({ zoomFactor: 1.5 }),
        )
      })
    })

    it('calls bridge.setZoom when zoomfactor changes', async () => {
      const el = createElement({ src: 'https://example.com' })
      await vi.waitFor(() => expect(mockBridge.create).toHaveBeenCalled())
      mockBridge.create.mockClear()

      el.setAttribute('zoomfactor', '2.0')
      await Promise.resolve()

      expect(mockBridge.setZoom).toHaveBeenCalledWith(expect.any(String), 2.0)
    })
  })

  // ------------------------------------------------------------------
  // CustomEvents
  // ------------------------------------------------------------------

  describe('CustomEvents', () => {
    it('dispatches webcontent:state-changed when bridge emits', async () => {
      const el = createElement()

      await vi.waitFor(() => expect(mockBridge.onEvent).toHaveBeenCalled())
      const cb = (mockBridge.onEvent as any).mock.calls[0][0]
      expect(cb).toBeTypeOf('function')

      const handler = vi.fn()
      document.addEventListener('webcontent:state-changed', handler)

      cb({ type: 'state-changed', id: el.viewId, state: 'active' })
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({ state: 'active' }),
        }),
      )
    })

    it('dispatches webcontent:load when bridge emits finish-load', async () => {
      const el = createElement()

      await vi.waitFor(() => expect(mockBridge.onEvent).toHaveBeenCalled())
      const cb = (mockBridge.onEvent as any).mock.calls[0][0]

      const handler = vi.fn()
      document.addEventListener('webcontent:load', handler)

      cb({ type: 'did-finish-load', id: el.viewId })
      expect(handler).toHaveBeenCalled()
    })

    it('dispatches webcontent:title-changed when bridge emits', async () => {
      const el = createElement()

      await vi.waitFor(() => expect(mockBridge.onEvent).toHaveBeenCalled())
      const cb = (mockBridge.onEvent as any).mock.calls[0][0]

      const handler = vi.fn()
      document.addEventListener('webcontent:title-changed', handler)

      cb({ type: 'title-updated', id: el.viewId, title: 'My Page' })
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({ title: 'My Page' }),
        }),
      )
    })
  })
})
