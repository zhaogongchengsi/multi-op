import { eq, asc, isNull } from 'drizzle-orm'
import { getDb } from '../db.js'
import { session } from '../schema.js'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

export type Session = InferSelectModel<typeof session>
export type NewSession = InferInsertModel<typeof session>

export async function createSession(
  data: Omit<NewSession, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Session> {
  const now = new Date().toISOString()
  await getDb()
    .insert(session)
    .values({ ...data, createdAt: now, updatedAt: now })
  const rows = await getDb().select().from(session).orderBy(asc(session.id)).all()
  return rows[rows.length - 1]
}

export async function getSession(id: number): Promise<Session | undefined> {
  return await getDb().select().from(session).where(eq(session.id, id)).get()
}

export async function listSessions(): Promise<Session[]> {
  return await getDb()
    .select()
    .from(session)
    .orderBy(asc(session.position), asc(session.id))
    .all()
}

export async function listSessionsByGroup(groupId: number | null): Promise<Session[]> {
  const cond = groupId === null ? isNull(session.groupId) : eq(session.groupId, groupId)
  return await getDb()
    .select()
    .from(session)
    .where(cond)
    .orderBy(asc(session.position), asc(session.id))
    .all()
}

export async function listSessionsByPlatform(platform: string): Promise<Session[]> {
  return await getDb()
    .select()
    .from(session)
    .where(eq(session.platform, platform))
    .orderBy(asc(session.position), asc(session.id))
    .all()
}

export async function listSessionsByAutoOpen(): Promise<Session[]> {
  return await getDb()
    .select()
    .from(session)
    .where(eq(session.autoOpen, 1))
    .all()
}

export async function updateSession(
  id: number,
  data: Partial<Omit<NewSession, 'id' | 'createdAt'>>,
): Promise<void> {
  await getDb()
    .update(session)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(session.id, id))
}

export async function deleteSession(id: number): Promise<void> {
  await getDb().delete(session).where(eq(session.id, id))
}

export async function moveSessionToGroup(
  sessionId: number,
  groupId: number | null,
): Promise<void> {
  await updateSession(sessionId, { groupId })
}

export async function reorderSession(id: number, position: number): Promise<void> {
  await updateSession(id, { position })
}
