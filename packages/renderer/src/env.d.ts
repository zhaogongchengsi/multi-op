import type { LogLevel } from '@multi-op/logger'

declare global {
  interface Window {
    loggerAPI: {
      log: (level: LogLevel, ...args: unknown[]) => void
    }
  }
}

export {}
