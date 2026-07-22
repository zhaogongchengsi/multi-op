import type { LogEntry, LogLevel, Transport } from './types'
import { LOG_LEVEL_RANK } from './types'

export interface LoggerOptions {
  level?: LogLevel
  transports?: Transport[]
  source?: 'main' | 'renderer'
}

export class Logger {
  private level: LogLevel
  private transports: Transport[]
  private source: 'main' | 'renderer'

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info'
    this.transports = options.transports ?? []
    this.source = options.source ?? 'main'
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[this.level]
  }

  private write(level: LogLevel, args: unknown[]): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '),
      args,
      timestamp: Date.now(),
      source: this.source,
    }

    for (const transport of this.transports) {
      transport.log(entry)
    }
  }

  debug(...args: unknown[]): void {
    this.write('debug', args)
  }

  info(...args: unknown[]): void {
    this.write('info', args)
  }

  warn(...args: unknown[]): void {
    this.write('warn', args)
  }

  error(...args: unknown[]): void {
    this.write('error', args)
  }

  child(context?: Partial<LoggerOptions>): Logger {
    return new Logger({
      level: context?.level ?? this.level,
      transports: context?.transports ?? [...this.transports],
      source: context?.source ?? this.source,
    })
  }
}
