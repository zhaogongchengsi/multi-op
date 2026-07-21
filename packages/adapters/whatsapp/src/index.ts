import type { PlatformType } from '@multi-op/shared'

export const platform: PlatformType = 'whatsapp'

export function getInterceptorCode(): string {
  return `
    // WhatsApp API 拦截
    const __waFetch = window.fetch.bind(window)
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input.url
      return __waFetch(input, init)
    }

    // WhatsApp WebSocket 拦截
    const __waWS = window.WebSocket.bind(window)
    window.WebSocket = function(url, protocols) {
      return new __waWS(url, protocols)
    }
    window.WebSocket.prototype = __waWS.prototype
  `
}
