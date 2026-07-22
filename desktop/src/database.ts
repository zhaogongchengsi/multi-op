import { app } from 'electron'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync } from 'node:fs'
import { initDb, runMigrations } from '@multi-op/database'

/**
 * 根据 environment 初始化数据库并执行迁移。
 *
 * - development: db 在 cwd/.multi-op/db.db，迁移文件在 packages/database/drizzle/
 * - production:  db 在 userData/.multi-op/db.db，迁移文件在 resources/drizzle/
 */
export function bootstrapDatabase() {
  const isDev = !app.isPackaged

  const dbDir = isDev
    ? join(process.cwd(), '.multi-op')
    : join(app.getPath('userData'), '.multi-op')

  const migrationsDir = isDev
    ? resolve(dirname(fileURLToPath(import.meta.url)), '../../packages/database/drizzle')
    : join(process.resourcesPath, 'drizzle')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  initDb(join(dbDir, 'db.db'))
  runMigrations(migrationsDir)
}
