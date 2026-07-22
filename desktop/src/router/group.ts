import type { HolixProtocolRouter } from '@holix/router'
import {
  createGroup,
  getGroup,
  listGroups,
  listGroupsByParent,
  updateGroup,
  deleteGroup,
} from '@multi-op/database'
import type { Group, NewGroup } from '@multi-op/database'

/**
 * Register group CRUD routes on the given router.
 */
export function registerGroupRoutes(router: HolixProtocolRouter): void {
  // ─── GET /api/groups — List all groups ─────────────────────────
  router.get('/api/groups', async (ctx) => {
    const groups = await listGroups()
    ctx.json({ data: groups })
  })

  // ─── GET /api/groups/parent/:parentId — List groups by parent ──
  router.get('/api/groups/parent/:parentId', async (ctx) => {
    const parentId = ctx.params.parentId === 'null' ? null : Number(ctx.params.parentId)
    const groups = await listGroupsByParent(parentId)
    ctx.json({ data: groups })
  })

  // ─── GET /api/groups/:id — Get single group ──────────────────
  router.get('/api/groups/:id', async (ctx) => {
    const id = Number(ctx.params.id)
    const g = await getGroup(id)
    if (!g) {
      ctx.status(404).json({ error: 'Group not found' })
      return
    }
    ctx.json({ data: g })
  })

  // ─── POST /api/groups — Create a group ───────────────────────
  router.post('/api/groups', async (ctx) => {
    const body = (await ctx.req.json()) as Omit<NewGroup, 'id' | 'createdAt' | 'updatedAt'>
    const g = await createGroup(body)
    ctx.status(201).json({ data: g })
  })

  // ─── PUT /api/groups/:id — Update a group ────────────────────
  router.put('/api/groups/:id', async (ctx) => {
    const id = Number(ctx.params.id)
    const body = (await ctx.req.json()) as Partial<Omit<NewGroup, 'id' | 'createdAt'>>
    await updateGroup(id, body)
    ctx.json({ success: true })
  })

  // ─── DELETE /api/groups/:id — Delete a group ─────────────────
  router.delete('/api/groups/:id', async (ctx) => {
    const id = Number(ctx.params.id)
    await deleteGroup(id)
    ctx.json({ success: true })
  })
}
