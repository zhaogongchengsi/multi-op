import type { PlatformType } from '@multi-op/shared'
import { getDb } from './database'

interface Account {
  id: string
  platform: PlatformType
  accountId: string
  cookies: string | null
  status: 'active' | 'inactive' | 'expired'
  createdAt: number
  updatedAt: number
}

export class AccountManager {
  async list(platform?: PlatformType): Promise<Account[]> {
    const db = getDb()
    if (platform) {
      const rows = await db.execute({
        sql: 'SELECT * FROM accounts WHERE platform = ? ORDER BY created_at DESC',
        args: [platform],
      })
      return rows.rows as unknown as Account[]
    }
    const rows = await db.execute('SELECT * FROM accounts ORDER BY created_at DESC')
    return rows.rows as unknown as Account[]
  }

  async get(id: string): Promise<Account | null> {
    const db = getDb()
    const rows = await db.execute({
      sql: 'SELECT * FROM accounts WHERE id = ?',
      args: [id],
    })
    return (rows.rows[0] as Account) ?? null
  }

  async save(account: Omit<Account, 'createdAt' | 'updatedAt'>) {
    const db = getDb()
    await db.execute({
      sql: `INSERT INTO accounts (id, platform, account_id, cookies, status)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(platform, account_id) DO UPDATE SET
              cookies = excluded.cookies,
              status = excluded.status,
              updated_at = unixepoch()`,
      args: [account.id, account.platform, account.accountId, account.cookies, account.status],
    })
  }

  async delete(id: string) {
    const db = getDb()
    await db.execute({
      sql: 'DELETE FROM accounts WHERE id = ?',
      args: [id],
    })
  }
}
