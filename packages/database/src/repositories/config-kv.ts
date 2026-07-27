import { getDb } from '../db.js'
import { appConfig } from '../schema.js'
import { like } from 'drizzle-orm'
import { Debouncer } from '@tanstack/pacer'

/**
 * Flatten a nested object into a flat key-value map using "." as separator.
 * Arrays are stored as JSON strings (not expanded).
 */
function flatten(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (val === null || val === undefined) {
      result[fullKey] = JSON.stringify(null)
    } else if (Array.isArray(val)) {
      result[fullKey] = JSON.stringify(val)
    } else if (typeof val === 'object') {
      Object.assign(result, flatten(val as Record<string, unknown>, fullKey))
    } else {
      result[fullKey] = JSON.stringify(val)
    }
  }

  return result
}

/**
 * Unflatten a flat key-value map back into a nested object.
 * Values are JSON.parsed to restore original types.
 */
function unflatten(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, raw] of Object.entries(flat)) {
    const parts = key.split('.')
    const value = JSON.parse(raw)
    let current = result

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }

    current[parts[parts.length - 1]] = value
  }

  return result
}

// ─── Debounced writers (one per prefix) ──────────────────────────
const debouncedWriters = new Map<string, Debouncer<(data: Record<string, unknown>) => void>>()

/**
 * Read all config entries under a prefix and unflatten them into a nested object.
 *
 * @example
 * // DB has: "window.width"="1280", "window.height"="720", "window.x"="100"
 * const cfg = await readConfig('window')
 * // → { width: 1280, height: 720, x: 100 }
 */
export async function readConfig(
  prefix: string,
): Promise<Record<string, unknown>> {
  const db = getDb()
  const rows = await db
    .select({ key: appConfig.key, value: appConfig.value })
    .from(appConfig)
    .where(like(appConfig.key, `${prefix}.%`))

  const flat: Record<string, string> = {}
  for (const row of rows) {
    flat[row.key.slice(prefix.length + 1)] = row.value
  }

  return unflatten(flat)
}

/**
 * Write a nested config object under a prefix.
 * First clears all existing keys under the prefix, then writes the new values.
 *
 * @example
 * await writeConfig('window', { width: 1280, height: 720, x: 100, y: 50 })
 * // Writes: "window.width"="1280", "window.height"="720", ...
 */
export async function writeConfig(
  prefix: string,
  obj: Record<string, unknown>,
): Promise<void> {
  const db = getDb()

  // Clear existing keys under this prefix
  await db.delete(appConfig).where(like(appConfig.key, `${prefix}.%`))

  const flat = flatten(obj)
  if (Object.keys(flat).length === 0) return

  // Batch insert with upsert
  const entries = Object.entries(flat).map(([k, v]) => ({
    key: `${prefix}.${k}`,
    value: v,
  }))

  await db.insert(appConfig).values(entries).onConflictDoUpdate({
    target: appConfig.key,
    set: { value: appConfig.value },
  })
}

/**
 * Debounced version of writeConfig. Only the last call within `wait` ms is
 * actually persisted. Each prefix gets its own independent debouncer.
 *
 * @example
 * // Rapidly called on every resize/move event, only persists after movement stops
 * writeConfigDebounced('window', { x: 100, y: 50, width: 1280, height: 720 })
 */
export function writeConfigDebounced(
  prefix: string,
  obj: Record<string, unknown>,
  wait = 300,
): void {
  if (!debouncedWriters.has(prefix)) {
    const debounced = new Debouncer(
      (data: Record<string, unknown>) => { writeConfig(prefix, data) },
      { wait },
    )
    debouncedWriters.set(prefix, debounced)
  }
  debouncedWriters.get(prefix)!.maybeExecute(obj)
}

/**
 * Clear all config entries under a prefix.
 */
export async function clearConfig(prefix: string): Promise<void> {
  const db = getDb()
  await db.delete(appConfig).where(like(appConfig.key, `${prefix}.%`))
}
