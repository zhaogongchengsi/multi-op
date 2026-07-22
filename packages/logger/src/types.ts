export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

export const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export interface LogEntry {
  level: LogLevel
  message: string
  args: unknown[]
  timestamp: number
  source: 'main' | 'renderer'
}

export interface Transport {
  log(entry: LogEntry): void
}
