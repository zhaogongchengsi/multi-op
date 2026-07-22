import { SCHEME } from '@multi-op/shared'

const SCHEME_URL = `${SCHEME}://`

;(async () => {
  const { contextBridge } = await import('electron')

  contextBridge.exposeInMainWorld('api', {
    SCHEME_URL,
    api: {},
  })
})()
