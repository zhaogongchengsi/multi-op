import { contextBridge, ipcRenderer } from 'electron'
import { SCHEME } from '@multi-op/shared'

const SCHEME_URL = `${SCHEME}://`

const api = {
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
ipcRenderer.send('preload:ready')
