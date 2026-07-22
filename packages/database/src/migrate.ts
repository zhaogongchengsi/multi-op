import { migrate } from 'drizzle-orm/libsql/migrator'
import { getDb } from './db.js'

/**
 * 运行 drizzle 迁移。
 * @param migrationsDir 迁移文件所在目录（由 app 传入可写路径，如 userData/drizzle）
 */
export function runMigrations(migrationsDir: string) {
  const db = getDb()
  migrate(db, { migrationsFolder: migrationsDir })
}
