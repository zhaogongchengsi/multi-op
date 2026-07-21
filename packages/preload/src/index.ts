import { contextBridge, ipcRenderer } from 'electron'
import { SCHEME } from '@multi-op/shared'

/**
 * MultiOp 通信层
 * 通过 contextBridge 注入到页面，内部使用 fetch/SSE over 自定义协议
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

  // ========== Hook 注册 ==========
  hook: (event: string, config: {
    filter?: string
    handler: string
    platform?: string
    priority?: number
  }) => {
    return api.post('/api/hooks/register', { event, ...config })
  },

  // ========== Storage (按 viewId 隔离) ==========
  storage: {
    get: (key: string) => api.get(`/api/storage/${key}`),
    set: (key: string, value: unknown) => api.post(`/api/storage/${key}`, { value }),
  },

  // ========== 事件监听 (SSE) ==========
  onEvent: (event: string, callback: (data: unknown) => void) => {
    const es = new EventSource(`${SCHEME_URL}api/events`)
    es.addEventListener(event, (e) => {
      callback(JSON.parse(e.data))
    })
    return () => es.close()
  },
}

contextBridge.exposeInMainWorld('__multiOp', api)

// 通知主进程 preload 已就绪
ipcRenderer.send('preload:ready')
