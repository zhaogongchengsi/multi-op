import { app } from 'electron'
import { join } from 'node:path'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'

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
