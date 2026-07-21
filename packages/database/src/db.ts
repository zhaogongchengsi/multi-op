import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import * as schema from './schema.js'

function getUserDataPath(): string {
  try {
    const { app } = require('electron')
    if (app?.getPath) return app.getPath('userData')
  } catch {
    // 不在 Electron 环境，fallback 到 cwd
  }
  return process.cwd()
}

let _rawDb: Database.Database | null = null
let _db: BetterSQLite3Database<typeof schema> | null = null

export function getRawDb(): Database.Database {
  if (!_rawDb) {
    const userDataDir = join(getUserDataPath(), '.multi-op')
    if (!existsSync(userDataDir)) {
      mkdirSync(userDataDir, { recursive: true })
    }
    _rawDb = new Database(join(userDataDir, 'multi-op.db'))
    _rawDb.pragma('journal_mode = WAL')
  }
  return _rawDb
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    _db = drizzle(getRawDb(), { schema })
  }
  return _db
}
