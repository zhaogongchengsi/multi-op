import type { HolixProtocolRouter } from '@holix/router'
import { readConfig, writeConfig } from '@multi-op/database'

/**
 * Register config read/write routes on the given router.
 */
export function registerConfigRoutes(router: HolixProtocolRouter): void {
  // ─── GET /api/config/:prefix — Read config ──────────────────
  router.get('/api/config/:prefix', async (ctx) => {
    try {
      const config = await readConfig(ctx.params.prefix)
      ctx.json({ data: config })
    } catch (e) {
      ctx.status(500).json({ error: String(e) })
    }
  })

  // ─── PUT /api/config/:prefix — Write config ─────────────────
  router.put('/api/config/:prefix', async (ctx) => {
    try {
      const body = await ctx.req.json()
      await writeConfig(ctx.params.prefix, body)
      ctx.json({ success: true })
    } catch (e) {
      ctx.status(500).json({ error: String(e) })
    }
  })
}
