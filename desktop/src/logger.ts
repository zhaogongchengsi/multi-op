import { ipcMain } from 'electron'
import { join } from 'node:path'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { Logger, ConsoleTransport, FileTransport } from '@multi-op/logger'
import type { LogLevel } from '@multi-op/logger'
import { workspace } from './constant';

export function writeCrashLog(error: unknown) {
  const dir = workspace
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
  writeFileSync(join(workspace, 'crash.log'), log, { flag: 'a' })
}

// ========== Main Logger ==========
const logDir = join(workspace, 'logs')

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
