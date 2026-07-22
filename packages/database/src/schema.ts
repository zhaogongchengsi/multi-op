import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const appConfig = sqliteTable('app_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const group = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  position: integer('position').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const session = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  platform: text('platform').notNull(),
  title: text('title'),
  avatar: text('avatar'),
  groupId: integer('group_id'),
  position: integer('position').default(0),
  status: text('status').default('active'),
  autoOpen: integer('auto_open').default(0),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
