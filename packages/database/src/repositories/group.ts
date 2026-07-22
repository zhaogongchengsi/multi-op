import { eq, asc, isNull } from 'drizzle-orm'
import { getDb } from '../db.js'
import { group } from '../schema.js'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

export type Group = InferSelectModel<typeof group>
export type NewGroup = InferInsertModel<typeof group>

export async function createGroup(
  data: Omit<NewGroup, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Group> {
  const now = new Date().toISOString()
  await getDb()
    .insert(group)
    .values({ ...data, createdAt: now, updatedAt: now })
  const rows = await getDb().select().from(group).orderBy(asc(group.id)).all()
  return rows[rows.length - 1]
}

export async function getGroup(id: number): Promise<Group | undefined> {
  return await getDb().select().from(group).where(eq(group.id, id)).get()
}

export async function listGroups(): Promise<Group[]> {
  return await getDb()
    .select()
    .from(group)
    .orderBy(asc(group.position), asc(group.id))
    .all()
}

export async function listGroupsByParent(parentId: number | null): Promise<Group[]> {
  const cond = parentId === null ? isNull(group.parentId) : eq(group.parentId, parentId)
  return await getDb()
    .select()
    .from(group)
    .where(cond)
    .orderBy(asc(group.position), asc(group.id))
    .all()
}

export async function updateGroup(
  id: number,
  data: Partial<Omit<NewGroup, 'id' | 'createdAt'>>,
): Promise<void> {
  await getDb()
    .update(group)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(group.id, id))
}

export async function deleteGroup(id: number): Promise<void> {
  await getDb().delete(group).where(eq(group.id, id))
}
