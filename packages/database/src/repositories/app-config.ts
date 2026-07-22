import { eq } from 'drizzle-orm'
import { getDb } from '../db.js'
import { appConfig } from '../schema.js'

export async function getConfig(key: string): Promise<string | undefined> {
  const row = await getDb().select().from(appConfig).where(eq(appConfig.key, key)).get()
  return row?.value
}

export async function setConfig(key: string, value: string): Promise<void> {
  await getDb().insert(appConfig).values({ key, value }).onConflictDoUpdate({
    target: appConfig.key,
    set: { value },
  })
}

export async function deleteConfig(key: string): Promise<void> {
  await getDb().delete(appConfig).where(eq(appConfig.key, key))
}
