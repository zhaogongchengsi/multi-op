import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { dirname } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import * as schema from './schema.js'

let _rawDb: Database.Database | null = null
let _db: BetterSQLite3Database<typeof schema> | null = null
let _dbPath: string | null = null

/**
 * 初始化数据库连接。
 * @param dbPath 数据库文件完整路径（含文件名，如 /path/to/multi-op.db）
 */
export function initDb(dbPath: string) {
  if (_rawDb) {
    throw new Error('Database already initialized')
  }
  const dir = dirname(dbPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  _dbPath = dbPath
  _rawDb = new Database(dbPath)
  _rawDb.pragma('journal_mode = WAL')
  _db = drizzle(_rawDb, { schema })
}

export function getRawDb(): Database.Database {
  if (!_rawDb) {
    throw new Error('Database not initialized, call initDb() first')
  }
  return _rawDb
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    throw new Error('Database not initialized, call initDb() first')
  }
  return _db
}

export function getDbPath(): string {
  if (!_dbPath) {
    throw new Error('Database not initialized, call initDb() first')
  }
  return _dbPath
}
