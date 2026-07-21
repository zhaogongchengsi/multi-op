import { createClient } from '@libsql/client'
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

let db: ReturnType<typeof createClient> | null = null

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

export function getDb() {
  if (!db) {
    const userDataDir = join(getUserDataPath(), '.multi-op')
    if (!existsSync(userDataDir)) {
      mkdirSync(userDataDir, { recursive: true })
    }
    db = createClient({
      url: `file://${join(userDataDir, 'multi-op.db')}`,
    })
  }
  return db
}

export async function migrateDb() {
  const client = getDb()
  await client.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      account_id TEXT NOT NULL,
      cookies TEXT,
      status TEXT DEFAULT 'inactive',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(platform, account_id)
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT DEFAULT '1.0.0',
      code TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 100,
      permissions TEXT DEFAULT '[]',
      platforms TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS layout_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      view_id TEXT,
      script_id TEXT,
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      view_id TEXT,
      script_id TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)
}
