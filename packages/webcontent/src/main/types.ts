import { z } from 'zod'

// =========================================================================
// Lifecycle States
// =========================================================================

/**
 * Full lifecycle of a single WebContentsView.
 *
 * ```
 *                    ┌── hidden ──┐
 *                    │            │
 * idle → configuring → loading → active
 *                       ↘ error   │
 *                                 │
 * active → dormant               │
 * hidden → dormant               │
 * dormant → active               │
 * active → closing → closed      │
 * hidden → closing → closed      │
 * dormant → closing → closed     │
 * ```
 */
export const ZViewState = z.enum([
  'idle',          // created but not yet configuring
  'configuring',   // setting up proxy / session
  'loading',       // loading content
  'active',        // ready and interactive
  'error',         // failed to load
  'hidden',        // in DOM but hidden (retain instance, off contentView)
  'dormant',       // removed from DOM, in pool (persist)
  'closing',       // being destroyed
  'closed',        // destroyed
])
export type ViewState = z.infer<typeof ZViewState>

/** Allowed state transitions. */
export const ALLOWED_TRANSITIONS: Record<ViewState, ReadonlySet<ViewState>> = {
  idle:        new Set<ViewState>(['configuring', 'loading', 'closing']),
  configuring: new Set<ViewState>(['loading', 'error', 'closing']),
  loading:     new Set<ViewState>(['active', 'error', 'hidden', 'dormant', 'closing']),
  active:      new Set<ViewState>(['loading', 'hidden', 'dormant', 'configuring', 'closing']),
  error:       new Set<ViewState>(['loading', 'configuring', 'closing']),
  hidden:      new Set<ViewState>(['active', 'dormant', 'configuring', 'closing']),
  dormant:     new Set<ViewState>(['active', 'closing']),
  closing:     new Set<ViewState>(['closed']),
  closed:      new Set<ViewState>(),
}

/** Which states permit which operations. */
export const OPERATION_STATES: Record<string, ReadonlySet<ViewState>> = {
  loadURL:    new Set<ViewState>(['idle', 'active', 'error']),
  reload:     new Set<ViewState>(['active', 'error']),
  goBack:     new Set<ViewState>(['active']),
  goForward:  new Set<ViewState>(['active']),
  stop:       new Set<ViewState>(['loading']),
  setZoom:    new Set<ViewState>(['idle', 'configuring', 'loading', 'active', 'error']),
  setBounds:  new Set<ViewState>(['idle', 'configuring', 'loading', 'active', 'error', 'hidden']),
  configureProxy: new Set<ViewState>(['idle', 'active', 'hidden']),
}

// =========================================================================
// Schemas
// =========================================================================

export const ZBoundsRect = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
})
export type BoundsRect = z.infer<typeof ZBoundsRect>

export const ZWebContentOptions = z.object({
  id: z.string().min(1),
  src: z.string().optional(),
  partition: z.string().optional(),
  preload: z.string().optional(),
  zoomFactor: z.number().positive().optional(),
  userAgent: z.string().optional(),
  httpReferrer: z.string().optional(),
  proxyRules: z.string().optional(),
  proxyBypassRules: z.string().optional(),
  loadingTimeout: z.number().nonnegative().optional(),
  allowNavigation: z.string().optional(),
  permissions: z.string().optional(),
  mute: z.boolean().optional(),
  devtools: z.boolean().optional(),
})
export type WebContentOptions = z.infer<typeof ZWebContentOptions>

export const ZManagerOptions = z.object({
  maxPoolSize: z.number().int().positive().default(5),
  idleTimeout: z.number().int().nonnegative().default(30 * 60_000),
})
export type ManagerOptions = z.infer<typeof ZManagerOptions>

// =========================================================================
// Events
// =========================================================================

export const ZWebContentEventType = z.enum([
  'did-navigate',
  'title-updated',
  'did-finish-load',
  'did-fail-load',
  'state-changed',
  'proxy-configured',
])
export type WebContentEventType = z.infer<typeof ZWebContentEventType>

export const ZWebContentEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('did-navigate'), id: z.string(), url: z.string() }),
  z.object({ type: z.literal('title-updated'), id: z.string(), title: z.string() }),
  z.object({ type: z.literal('did-finish-load'), id: z.string() }),
  z.object({
    type: z.literal('did-fail-load'),
    id: z.string(),
    url: z.string(),
    errorCode: z.number(),
    errorDescription: z.string(),
  }),
  z.object({ type: z.literal('state-changed'), id: z.string(), state: ZViewState }),
  z.object({ type: z.literal('proxy-configured'), id: z.string() }),
])
export type WebContentEvent = z.infer<typeof ZWebContentEvent>

// =========================================================================
// IPC Protocol
// =========================================================================

function channel<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  name: string,
  input: I,
  output: O,
) {
  return { name, input, output } as const
}

export const webContentProtocol = {
  create:   channel('webcontent:create', ZWebContentOptions, z.void()),
  remove:   channel('webcontent:remove', z.object({ id: z.string(), detachDestroy: z.boolean().optional() }), z.void()),
  loadURL:  channel('webcontent:load-url', z.object({ id: z.string(), url: z.string() }), z.void()),
  setBounds:channel('webcontent:set-bounds', z.object({ id: z.string(), bounds: ZBoundsRect }), z.void()),
  reload:   channel('webcontent:reload', z.string(), z.void()),
  goBack:   channel('webcontent:go-back', z.string(), z.void()),
  goForward:channel('webcontent:go-forward', z.string(), z.void()),
  stop:     channel('webcontent:stop', z.string(), z.void()),
  setZoom:  channel('webcontent:set-zoom', z.object({ id: z.string(), factor: z.number().positive() }), z.void()),
  setHidden:channel('webcontent:set-hidden', z.object({ id: z.string(), hidden: z.boolean() }), z.void()),
  updateProxy: channel('webcontent:update-proxy', z.object({ id: z.string(), rules: z.string(), bypassRules: z.string().optional() }), z.void()),
  setMute:  channel('webcontent:set-mute', z.object({ id: z.string(), mute: z.boolean() }), z.void()),
  capture:  channel('webcontent:capture', z.object({ id: z.string() }), z.object({ dataUrl: z.string() })),
} as const
