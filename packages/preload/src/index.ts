import { contextBridge, ipcRenderer } from 'electron'
import { SCHEME } from '@multi-op/shared'

/**
 * MultiOp 通信层
 * 通过 contextBridge 注入到页面，提供简单的 ipc 通信能力
 */
const SCHEME_URL = `${SCHEME}://`

const api = {
  // ========== Fetch-based IPC ==========
  call: (method: string, path: string, body?: unknown) => {
    return fetch(`${SCHEME_URL}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json())
  },

  get: (path: string) => api.call('GET', path),
  post: (path: string, body?: unknown) => api.call('POST', path, body),
}

contextBridge.exposeInMainWorld('__multiOp', api)

// 通知主进程 preload 已就绪
ipcRenderer.send('preload:ready')
