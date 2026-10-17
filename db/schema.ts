import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  state: jsonb("state").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const missions = pgTable("missions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  projectId: text("project_id").notNull(),
  prompt: text("prompt").notNull(),
  roles: jsonb("roles").notNull(),
  results: jsonb("results").notNull().default([]),
  status: text("status").notNull().default("ready"),
  error: text("error"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const aiQuotas = pgTable("ai_quotas", {
  id: text("id").primaryKey(),
  state: jsonb("state").notNull(),
});
