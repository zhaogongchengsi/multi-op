import { z } from 'zod'

// ========== Scheme ==========
export const SCHEME = 'multi-op'

// ========== Platform (defined first — referenced by ViewInstance) ==========
export const ZPlatformType = z.enum(['telegram', 'whatsapp', 'twitter'])
export type PlatformType = z.infer<typeof ZPlatformType>

export const ZPlatformInfo = z.object({
  type: ZPlatformType,
  name: z.string(),
  url: z.string(),
  icon: z.string(),
})
export type PlatformInfo = z.infer<typeof ZPlatformInfo>

export const PLATFORMS: Record<PlatformType, PlatformInfo> = {
  telegram: { type: 'telegram', name: 'Telegram', url: 'https://web.telegram.org', icon: '📱' },
  whatsapp: { type: 'whatsapp', name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: '💬' },
  twitter: { type: 'twitter', name: 'Twitter/X', url: 'https://twitter.com', icon: '🐦' },
}

// ========== View State ==========
export const ZViewPhase = z.enum([
  'creating', 'loading', 'intercepted', 'ready', 'active', 'hidden', 'destroyed',
])
export type ViewPhase = z.infer<typeof ZViewPhase>

export const ZAppPhase = z.enum(['init', 'ready', 'running', 'stopping', 'stopped'])
export type AppPhase = z.infer<typeof ZAppPhase>

export const ZViewState = z.enum(['normal', 'minimized', 'maximized', 'hidden'])
export type ViewState = z.infer<typeof ZViewState>

export const ZViewInstance = z.object({
  id: z.string(),
  platform: ZPlatformType,
  accountId: z.string(),
  phase: ZViewPhase,
  order: z.number(),
  state: ZViewState,
  flexGrow: z.number(),
  minWidth: z.number(),
  minHeight: z.number(),
})
export type ViewInstance = z.infer<typeof ZViewInstance>

// ========== Script ==========
export const ZScriptPhase = z.enum(['preload', 'postload'])
export type ScriptPhase = z.infer<typeof ZScriptPhase>

export const ZScriptManifest = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  code: z.string(),
  phase: ZScriptPhase,
  enabled: z.boolean(),
  priority: z.number(),
  permissions: z.array(z.string()),
  platforms: z.array(ZPlatformType),
})
export type ScriptManifest = z.infer<typeof ZScriptManifest>

// ========== Layout ==========
export const ZLayoutMode = z.enum(['tile', 'grid', 'stack', 'free'])
export type LayoutMode = z.infer<typeof ZLayoutMode>

export const ZLayoutView = z.object({
  id: z.string(),
  platform: ZPlatformType,
  accountId: z.string(),
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  state: ZViewState,
  order: z.number(),
  flexGrow: z.number(),
})
export type LayoutView = z.infer<typeof ZLayoutView>

export const ZLayoutSnapshot = z.object({
  mode: ZLayoutMode,
  views: z.array(ZLayoutView),
})
export type LayoutSnapshot = z.infer<typeof ZLayoutSnapshot>

// ========== IPC ==========
export const IPC_CHANNELS = {
  VIEW_LAYOUT: 'layout:update',
  VIEW_FOCUS: 'view:focus',
  VIEW_HIDE: 'view:hide',
  VIEW_SHOW: 'view:show',
  VIEW_REMOVE: 'view:remove',
  VIEW_PHASE: 'view:phase',
  SCRIPT_RELOAD: 'script:reload',
  ACCOUNT_LOGIN: 'account:login',
  ACCOUNT_LOGOUT: 'account:logout',
} as const

export const ZIpcChannel = z.enum([
  'layout:update',
  'view:focus',
  'view:hide',
  'view:show',
  'view:remove',
  'view:phase',
  'script:reload',
  'account:login',
  'account:logout',
])
export type IpcChannel = z.infer<typeof ZIpcChannel>

// ========== Hook ==========
export const ZHookConfig = z.object({
  event: z.string(),
  priority: z.number().optional(),
  filter: z.string().optional(),
  handler: z.string(),
  platform: ZPlatformType.optional(),
})
export type HookConfig = z.infer<typeof ZHookConfig>

// ========== IPC Payload Schemas (for cross-process validation) ==========

export const ZLayoutUpdatePayload = z.object({
  views: z.array(ZLayoutView),
})
export type LayoutUpdatePayload = z.infer<typeof ZLayoutUpdatePayload>

export const ZScriptReloadPayload = z.object({
  viewId: z.string(),
  scriptId: z.string(),
})
export type ScriptReloadPayload = z.infer<typeof ZScriptReloadPayload>

export const ZAccountPayload = z.object({
  id: z.string(),
  platform: ZPlatformType,
  accountId: z.string(),
  cookies: z.string().nullable(),
  status: z.enum(['active', 'inactive', 'expired']),
})
export type AccountPayload = z.infer<typeof ZAccountPayload>
