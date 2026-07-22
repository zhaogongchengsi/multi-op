import type { LogLevel } from '@multi-op/logger'

declare global {
  interface Window {
    loggerAPI: {
      log: (level: LogLevel, ...args: unknown[]) => void
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
