import type { PlatformType } from '@multi-op/shared'

export const platform: PlatformType = 'twitter'

export function getInterceptorCode(): string {
  return `
    // Twitter/X API 拦截
    const __twFetch = window.fetch.bind(window)
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input.url
      return __twFetch(input, init)
    }

    // 隐藏自动化标记
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: false,
    })
  `
}
