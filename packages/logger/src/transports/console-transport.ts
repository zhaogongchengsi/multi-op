import type { LogEntry, Transport } from '../types'

const LEVEL_COLORS: Record<string, string> = {
  debug: '\x1b[90m',    // grey
  info: '\x1b[36m',     // cyan
  warn: '\x1b[33m',     // yellow
  error: '\x1b[31m',    // red
}

const RESET = '\x1b[0m'

export class ConsoleTransport implements Transport {
  constructor(
    private options: { color?: boolean } = {},
  ) {}

  log(entry: LogEntry): void {
    const time = new Date(entry.timestamp).toISOString()
    const label = entry.level.toUpperCase()
    const source = entry.source === 'renderer' ? '[Renderer]' : '[Main]'
    const color = this.options.color ?? true

    if (color) {
      const c = LEVEL_COLORS[entry.level] ?? ''
      console.log(`${c}${time} ${source} [${label}]${RESET}`, ...entry.args)
    } else {
      console.log(`${time} ${source} [${label}]`, ...entry.args)
    }
  }
}
