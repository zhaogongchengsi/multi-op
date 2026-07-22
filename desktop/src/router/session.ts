import type { HolixProtocolRouter } from '@holix/router'
import {
  createSession,
  getSession,
  listSessions,
  listSessionsByGroup,
  updateSession,
  deleteSession,
  reorderSession,
} from '@multi-op/database'
import type { Session, NewSession } from '@multi-op/database'

/**
 * Register session CRUD routes on the given router.
 */
export function registerSessionRoutes(router: HolixProtocolRouter): void {
  // ─── GET /api/sessions — List all sessions ───────────────────
  router.get('/api/sessions', async (ctx) => {
    const sessions = await listSessions()
    ctx.json({ data: sessions })
  })

  // ─── GET /api/sessions/group/:groupId — List sessions by group ───
  router.get('/api/sessions/group/:groupId', async (ctx) => {
    const groupId = ctx.params.groupId === 'null' ? null : Number(ctx.params.groupId)
    const sessions = await listSessionsByGroup(groupId)
    ctx.json({ data: sessions })
  })

  // ─── GET /api/sessions/:id — Get single session ─────────────
  router.get('/api/sessions/:id', async (ctx) => {
    const id = Number(ctx.params.id)
    const session = await getSession(id)
    if (!session) {
      ctx.status(404).json({ error: 'Session not found' })
      return
    }
    ctx.json({ data: session })
  })

  // ─── POST /api/sessions — Create a session ──────────────────
  router.post('/api/sessions', async (ctx) => {
    const body = (await ctx.req.json()) as Omit<NewSession, 'id' | 'createdAt' | 'updatedAt'>
    const session = await createSession(body)
    ctx.status(201).json({ data: session })
  })

  // ─── PUT /api/sessions/:id — Update a session ───────────────
  router.put('/api/sessions/:id', async (ctx) => {
    const id = Number(ctx.params.id)
    const body = (await ctx.req.json()) as Partial<Omit<NewSession, 'id' | 'createdAt'>>
    await updateSession(id, body)
    ctx.json({ success: true })
  })

  // ─── DELETE /api/sessions/:id — Delete a session ────────────
  router.delete('/api/sessions/:id', async (ctx) => {
    const id = Number(ctx.params.id)
    await deleteSession(id)
    ctx.json({ success: true })
  })

  // ─── PATCH /api/sessions/:id/reorder — Reorder a session ────
  router.patch('/api/sessions/:id/reorder', async (ctx) => {
    const id = Number(ctx.params.id)
    const { position } = (await ctx.req.json()) as { position: number }
    await reorderSession(id, position)
    ctx.json({ success: true })
  })
}
