import { createClient } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { dirname } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import * as schema from './schema.js'

let _client: ReturnType<typeof createClient> | null = null
let _db: LibSQLDatabase<typeof schema> | null = null
let _dbPath: string | null = null

/**
 * 初始化数据库连接。
 * @param dbPath 数据库文件完整路径（含文件名，如 /path/to/multi-op.db）
 */
export function initDb(dbPath: string) {
  if (_client) {
    throw new Error('Database already initialized')
  }
  const dir = dirname(dbPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  _dbPath = dbPath
  _client = createClient({ url: `file://${dbPath}` })
  _client.execute('PRAGMA journal_mode = WAL')
  _db = drizzle(_client, { schema })
}

export function getClient() {
  if (!_client) {
    throw new Error('Database not initialized, call initDb() first')
  }
  return _client
}

export function getDb(): LibSQLDatabase<typeof schema> {
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
