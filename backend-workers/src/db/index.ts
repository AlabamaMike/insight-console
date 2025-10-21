/**
 * Database connection and query utilities
 * Uses Neon serverless driver for PostgreSQL access from Cloudflare Workers
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { Env } from '../types';

/**
 * Get a Neon SQL client
 * For raw SQL queries using template literals
 */
export function getSQL(env: Env): NeonQueryFunction<boolean, boolean> {
  return neon(env.DATABASE_URL);
}

/**
 * Get a Drizzle ORM instance
 * For type-safe queries using Drizzle
 */
export function getDB(env: Env) {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

/**
 * Re-export schema for convenience
 */
export * from './schema';
