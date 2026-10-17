import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  state: jsonb('state').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
