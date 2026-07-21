// ========== Scheme ==========
export const SCHEME = 'multi-op'

// ========== View State ==========
export type ViewPhase =
  | 'creating'
  | 'loading'
  | 'intercepted'
  | 'ready'
  | 'active'
  | 'hidden'
  | 'destroyed'

export type AppPhase = 'init' | 'ready' | 'running' | 'stopping' | 'stopped'

export interface ViewInstance {
  id: string
  platform: PlatformType
  accountId: string
  phase: ViewPhase
  order: number
  state: 'normal' | 'minimized' | 'maximized' | 'hidden'
  flexGrow: number
  minWidth: number
  minHeight: number
}

// ========== Platform ==========
export type PlatformType = 'telegram' | 'whatsapp' | 'twitter'

export interface PlatformInfo {
  type: PlatformType
  name: string
  url: string
  icon: string
}

export const PLATFORMS: Record<PlatformType, PlatformInfo> = {
  telegram: { type: 'telegram', name: 'Telegram', url: 'https://web.telegram.org', icon: '📱' },
  whatsapp: { type: 'whatsapp', name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: '💬' },
  twitter: { type: 'twitter', name: 'Twitter/X', url: 'https://twitter.com', icon: '🐦' },
}

// ========== Script ==========
export interface ScriptManifest {
  id: string
  name: string
  version: string
  code: string
  phase: 'preload' | 'postload'
  enabled: boolean
  priority: number
  permissions: string[]
  platforms: PlatformType[]
}

// ========== Layout ==========
export interface LayoutSnapshot {
  mode: LayoutMode
  views: Array<{
    id: string
    platform: PlatformType
    accountId: string
    bounds: { x: number; y: number; width: number; height: number }
    state: 'normal' | 'minimized' | 'hidden'
    order: number
    flexGrow: number
  }>
}

export type LayoutMode = 'tile' | 'grid' | 'stack' | 'free'

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

// ========== Hook ==========
export interface HookConfig {
  event: string
  priority?: number
  filter?: string // JSON stringified filter function
  handler: string // JSON stringified handler function
  platform?: PlatformType
}
