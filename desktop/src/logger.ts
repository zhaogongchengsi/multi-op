import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { Logger, ConsoleTransport, FileTransport } from '@multi-op/logger'
import type { LogLevel } from '@multi-op/logger'

// ========== Crash Log ==========

function getLogDir(): string {
  try {
    return join(app.getPath('home'), '.multi-op')
  } catch {
    return join(process.cwd(), '.multi-op')
  }
}

export function writeCrashLog(error: unknown) {
  const dir = getLogDir()
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true })
    } catch {
      return // 无法创建目录则放弃
    }
  }

  const timestamp = new Date().toISOString()
  const message = error instanceof Error ? `${error.stack || error.message}` : String(error)

  const log = `[${timestamp}] FATAL: ${message}\n`
  writeFileSync(join(dir, 'crash.log'), log, { flag: 'a' })
}

// ========== Main Logger ==========

const logDir = import.meta.env.DEV
  ? join(process.cwd(), 'logs')
  : join(app.getPath('userData'), 'logs')

export const logger = new Logger({
  level: import.meta.env.DEV ? 'debug' : 'info',
  source: 'main',
  transports: [
    new ConsoleTransport(),
    new FileTransport({ dir: logDir }),
  ],
})

logger.info('Logger initialized', { dir: logDir })

// Listen for renderer logs
ipcMain.handle('logger:log', (_event, entry: { level: LogLevel; args: unknown[]; timestamp: number }) => {
  logger.child({ source: 'renderer' }).info(...entry.args)
})
