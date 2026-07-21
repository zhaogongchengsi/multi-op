import type { PlatformType } from '@multi-op/shared'

export const platform: PlatformType = 'telegram'

/** 注入到 TG 页面的拦截器代码 (executeJavaScript, worldId: 0) */
export function getInterceptorCode(): string {
  return `
    // Telegram API 拦截
    const __tgFetch = window.fetch.bind(window)
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input.url
      
      // 拦截 analytics
      if (url.includes('/analytics') || url.includes('/log/')) {
        return new Response('', { status: 204 })
      }
      
      return __tgFetch(input, init)
    }
  `
}
