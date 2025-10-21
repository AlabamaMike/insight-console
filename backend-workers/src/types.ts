/**
 * Type definitions for Cloudflare Workers environment
 */

export interface Env {
  // R2 Bucket binding for document storage
  DOCUMENTS: R2Bucket;

  // KV namespace for session management
  SESSIONS: KVNamespace;

  // Hyperdrive connection to Neon PostgreSQL
  DATABASE: Hyperdrive;

  // Secrets
  DATABASE_URL: string;
  ANTHROPIC_API_KEY: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;

  // Environment variables
  ENVIRONMENT: 'development' | 'production';
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  user_id: number;
  firm_id: string;
  email: string;
  role: 'investor' | 'consultant';
  exp: number;
  iat: number;
}

/**
 * User context set by authentication middleware
 */
export interface UserContext {
  user_id: number;
  firm_id: string;
  email: string;
  role: 'investor' | 'consultant';
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  user_id?: number;
  firm_id: string;
  action: string;
  resource_type: string;
  resource_id?: number;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  id: number;
  deal_id: number;
  firm_id: string;
  filename: string;
  mime_type: string;
  size: number;
  r2_key: string;
  uploaded_by: number;
  uploaded_at: string;
}

/**
 * Security event for logging
 */
export interface SecurityEvent {
  timestamp: string;
  type: 'auth_failure' | 'access_denied' | 'suspicious_activity' | 'rate_limit';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: number;
  firmId?: string;
  ipAddress?: string;
  details: Record<string, unknown>;
}
