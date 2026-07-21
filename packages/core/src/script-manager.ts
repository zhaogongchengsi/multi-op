import { WebContentsView } from 'electron'
import type { ScriptManifest } from '@multi-op/shared'
import { getDb } from './database'

export class ScriptManager {
  private loaded = new Map<string, Set<string>>() // viewId → scriptId[]

  // ========== Script CRUD ==========

  async list(): Promise<ScriptManifest[]> {
    const db = getDb()
    const rows = await db.execute('SELECT * FROM scripts ORDER BY priority ASC')
    return rows.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      version: r.version,
      code: r.code,
      phase: 'postload',
      enabled: !!r.enabled,
      priority: r.priority,
      permissions: JSON.parse(r.permissions || '[]'),
      platforms: JSON.parse(r.platforms || '[]'),
    }))
  }

  async save(script: ScriptManifest) {
    const db = getDb()
    await db.execute({
      sql: `INSERT INTO scripts (id, name, version, code, enabled, priority, permissions, platforms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              code = excluded.code,
              enabled = excluded.enabled,
              priority = excluded.priority,
              permissions = excluded.permissions,
              platforms = excluded.platforms,
              updated_at = unixepoch()`,
      args: [
        script.id,
        script.name,
        script.version,
        script.code,
        script.enabled ? 1 : 0,
        script.priority,
        JSON.stringify(script.permissions),
        JSON.stringify(script.platforms),
      ],
    })
  }

  async delete(id: string) {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM scripts WHERE id = ?', args: [id] })
  }

  // ========== Injection ==========

  async injectScripts(view: WebContentsView, viewId: string, platform: string) {
    const scripts = await this.list()
    const applicable = scripts.filter(
      (s) =>
        s.enabled &&
        (s.platforms.length === 0 || s.platforms.includes(platform as any)),
    )

    const injected = new Set<string>()

    for (const script of applicable) {
      try {
        await view.webContents.executeJavaScript(`
          (async () => {
            try {
              ${script.code}
              return { success: true, id: '${script.id}' }
            } catch (err) {
              return { success: false, id: '${script.id}', error: err.message }
            }
          })()
        `)
        injected.add(script.id)
      } catch (err) {
        console.error(`[ScriptManager] Failed to inject ${script.id}:`, err)
      }
    }

    this.loaded.set(viewId, injected)
    return injected
  }

  async reloadScript(view: WebContentsView, viewId: string, scriptId: string) {
    const scripts = await this.list()
    const script = scripts.find((s) => s.id === scriptId)
    if (!script) return false

    await view.webContents.executeJavaScript(`
      (async () => {
        try {
          ${script.code}
          return { success: true }
        } catch (err) {
          return { success: false, error: err.message }
        }
      })()
    `)
    return true
  }
}
