import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { getDb } from './db.js'

/**
 * 运行 drizzle 迁移。
 * 开发时先用 `drizzle-kit generate` 生成迁移文件，
 * 应用启动时自动执行未跑过的迁移。
 */
export function runMigrations() {
  const db = getDb()
  const migrationsFolder = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../drizzle',
  )
  migrate(db, { migrationsFolder })
}
