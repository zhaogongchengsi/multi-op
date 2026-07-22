import type { LogLevel } from '@multi-op/logger'
import { SCHEME } from '@multi-op/shared'
import ky from 'ky'

const SCHEME_URL = `${SCHEME}://`
const API_PREFIX = `${SCHEME_URL}app/api`

// ─── Ky requestor instance ──────────────────────────────────────
const requestor = ky.create({
  prefixUrl: API_PREFIX,
  timeout: 30_000,
  retry: 0,
})

// ─── Session API ────────────────────────────────────────────────
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

const sessionAPI = {
  /** List all sessions */
  list: (): Promise<{ data: SessionRecord[] }> =>
    requestor.get('sessions').json(),

  /** Get a single session by id */
  get: (id: number): Promise<{ data: SessionRecord }> =>
    requestor.get(`sessions/${id}`).json(),

  /** List sessions by group (pass null for ungrouped) */
  listByGroup: (groupId: number | null): Promise<{ data: SessionRecord[] }> =>
    requestor.get(`sessions/group/${groupId ?? 'null'}`).json(),

  /** Create a new session */
  create: (data: Record<string, unknown>): Promise<{ data: SessionRecord }> =>
    requestor.post('sessions', { json: data }).json(),

  /** Update an existing session */
  update: (id: number, data: Record<string, unknown>): Promise<{ success: boolean }> =>
    requestor.put(`sessions/${id}`, { json: data }).json(),

  /** Delete a session */
  delete: (id: number): Promise<{ success: boolean }> =>
    requestor.delete(`sessions/${id}`).json(),

  /** Reorder a session */
  reorder: (id: number, position: number): Promise<{ success: boolean }> =>
    requestor.patch(`sessions/${id}/reorder`, { json: { position } }).json(),
}

;(async () => {
  const { contextBridge, ipcRenderer } = await import('electron')

  contextBridge.exposeInMainWorld('bridge', {
    services: {
      SCHEME_URL,
      requestor,
      session: sessionAPI,
    },
  })

  contextBridge.exposeInMainWorld('loggerAPI', {
    log: (level: LogLevel, ...args: unknown[]) => {
      ipcRenderer.invoke('logger:log', { level, args, timestamp: Date.now() })
    },
  })

  // ─── Window Controls (for frameless window) ──────────────────
  contextBridge.exposeInMainWorld('windowControls', {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    onMaximizedChange: (callback: (maximized: boolean) => void) => {
      ipcRenderer.on('window:maximized-change', (_event, maximized) => callback(maximized))
    },
  })
})()
