import type { LogLevel } from '@multi-op/logger'
import { SCHEME } from '@multi-op/shared'

const SCHEME_URL = `${SCHEME}://`

;(async () => {
  const { contextBridge, ipcRenderer } = await import('electron')

  contextBridge.exposeInMainWorld('api', {
    SCHEME_URL,
    api: {},
  })

  contextBridge.exposeInMainWorld('loggerAPI', {
    log: (level: LogLevel, ...args: unknown[]) => {
      ipcRenderer.invoke('logger:log', { level, args, timestamp: Date.now() })
    },
  })
})()
