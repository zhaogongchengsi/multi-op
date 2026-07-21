import Database from 'better-sqlite3'
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

function getUserDataPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron')
    if (app?.getPath) return app.getPath('userData')
  } catch {
    // 不在 Electron 环境，fallback 到 cwd
  }
  return process.cwd()
}

let db: InstanceType<typeof Database> | null = null

export function getDb(): InstanceType<typeof Database> {
  if (!db) {
    const userDataDir = join(getUserDataPath(), '.multi-op')
    if (!existsSync(userDataDir)) {
      mkdirSync(userDataDir, { recursive: true })
    }
    db = new Database(join(userDataDir, 'multi-op.db'))
    db.pragma('journal_mode = WAL')
  }
  return db
}
