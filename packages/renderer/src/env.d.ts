import type { LogLevel } from '@multi-op/logger'

// ─── Bridge API types ────────────────────────────────────────────

declare global {
  interface SessionRecord {
    id: number
    platform: string
    title: string | null
    avatar: string | null
    groupId: number | null
    position: number | null
    status: string | null
    autoOpen: number | null
    expiresAt: string | null
    createdAt: string
    updatedAt: string
  }

  interface GroupRecord {
    id: number
    name: string
    parentId: number | null
    position: number | null
    createdAt: string
    updatedAt: string
  }

  interface GroupAPI {
    list: () => Promise<{ data: GroupRecord[] }>
    listByParent: (parentId: number | null) => Promise<{ data: GroupRecord[] }>
    get: (id: number) => Promise<{ data: GroupRecord }>
    create: (data: Record<string, unknown>) => Promise<{ data: GroupRecord }>
    update: (id: number, data: Record<string, unknown>) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
  }

  interface SessionAPI {
    list: () => Promise<{ data: SessionRecord[] }>
    get: (id: number) => Promise<{ data: SessionRecord }>
    listByGroup: (groupId: number | null) => Promise<{ data: SessionRecord[] }>
    create: (data: Record<string, unknown>) => Promise<{ data: SessionRecord }>
    update: (id: number, data: Record<string, unknown>) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
    reorder: (id: number, position: number) => Promise<{ success: boolean }>
  }

  interface BridgeServices {
    SCHEME_URL: string
    requestor: import('ky').KyInstance
    session: SessionAPI
    group: GroupAPI
  }

  interface Window {
    loggerAPI: {
      log: (level: LogLevel, ...args: unknown[]) => void
    }
    bridge: {
      services: BridgeServices
    }
    windowControls: {
      minimize: () => void
      maximize: () => void
      close: () => void
      onMaximizedChange: (callback: (maximized: boolean) => void) => void
    }
  }
}

export {}
