/**
 * Drizzle ORM schema definitions
 * Provides type-safe database schema for PostgreSQL via Neon
 */

import { pgTable, serial, varchar, text, integer, timestamp, boolean, jsonb, bigint, inet, pgEnum, index } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/**
 * Users table
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  full_name: varchar('full_name', { length: 255 }),
  firm_id: varchar('firm_id', { length: 100 }),
  role: varchar('role', { length: 50 }).default('consultant').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

/**
 * Magic Link Tokens table
 */
export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  token_hash: varchar('token_hash', { length: 64 }).notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  used_at: timestamp('used_at', { withTimezone: true }),
}, (table) => ({
  emailIdx: index('magic_link_tokens_email_idx').on(table.email),
  tokenHashIdx: index('magic_link_tokens_token_hash_idx').on(table.token_hash),
}));

export type MagicLinkToken = InferSelectModel<typeof magicLinkTokens>;
export type NewMagicLinkToken = InferInsertModel<typeof magicLinkTokens>;

/**
 * Deal status enum
 */
export const dealStatusEnum = pgEnum('deal_status', ['draft', 'analyzing', 'synthesis', 'ready', 'archived']);

/**
 * Deals table
 */
export const deals = pgTable('deals', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  target_company: varchar('target_company', { length: 255 }),
  sector: varchar('sector', { length: 100 }),
  deal_type: varchar('deal_type', { length: 50 }),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  key_questions: jsonb('key_questions').default([]),
  hypotheses: jsonb('hypotheses').default([]),
  created_by_id: integer('created_by_id').notNull().references(() => users.id),
  firm_id: varchar('firm_id', { length: 100 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export type Deal = InferSelectModel<typeof deals>;
export type NewDeal = InferInsertModel<typeof deals>;

/**
 * Documents table
 */
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  deal_id: integer('deal_id').notNull().references(() => deals.id),
  filename: varchar('filename', { length: 255 }).notNull(),
  file_path: varchar('file_path', { length: 500 }).notNull(),
  file_size: bigint('file_size', { mode: 'number' }),
  mime_type: varchar('mime_type', { length: 100 }),
  uploaded_by_id: integer('uploaded_by_id').notNull().references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;

/**
 * Workflows table
 */
export const workflows = pgTable('workflows', {
  id: serial('id').primaryKey(),
  deal_id: integer('deal_id').notNull().references(() => deals.id),
  workflow_type: varchar('workflow_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  input_data: jsonb('input_data'),
  output_data: jsonb('output_data'),
  error_message: text('error_message'),
  started_by_id: integer('started_by_id').notNull().references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
});

export type Workflow = InferSelectModel<typeof workflows>;
export type NewWorkflow = InferInsertModel<typeof workflows>;

/**
 * Syntheses table
 */
export const syntheses = pgTable('syntheses', {
  id: serial('id').primaryKey(),
  deal_id: integer('deal_id').notNull().references(() => deals.id),
  investment_thesis: text('investment_thesis'),
  key_risks: jsonb('key_risks').default([]),
  key_opportunities: jsonb('key_opportunities').default([]),
  recommendation: varchar('recommendation', { length: 50 }),
  confidence_score: integer('confidence_score'),
  workflow_ids: jsonb('workflow_ids').default([]),
  created_by_id: integer('created_by_id').notNull().references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export type Synthesis = InferSelectModel<typeof syntheses>;
export type NewSynthesis = InferInsertModel<typeof syntheses>;

/**
 * Audit logs table
 */
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  firm_id: varchar('firm_id', { length: 100 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  resource_type: varchar('resource_type', { length: 100 }).notNull(),
  resource_id: integer('resource_id'),
  ip_address: varchar('ip_address', { length: 45 }), // Using varchar instead of inet for simplicity
  user_agent: text('user_agent'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;
