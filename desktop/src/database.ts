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
  const dbDir = import.meta.env.DEV
    ? join(process.cwd(), '.multi-op')
    : join(app.getPath('home'), '.multi-op')

  const migrationsDir = import.meta.env.DEV
    ? resolve(dirname(fileURLToPath(import.meta.url)), '../../packages/database/drizzle')
    : join(process.resourcesPath, 'drizzle')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  // 生产环境下：将 resources/drizzle 复制到可写的 userData/.multi-op/drizzle/
  // if (import.meta.env.PROD && !existsSync(migrationsDir)) {
  //   const src = join(process.resourcesPath, 'drizzle')
  //   if (existsSync(src)) {
  //     cpSync(src, migrationsDir, { recursive: true })
  //   }
  // }

  initDb(join(dbDir, 'db.db'))
  runMigrations(migrationsDir)
}
