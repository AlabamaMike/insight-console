/**
 * Audit logging utilities
 * Comprehensive logging for security and compliance
 */

import { Context } from 'hono';
import { neon } from '@neondatabase/serverless';
import { Env, AuditLogEntry, UserContext } from '../types';

/**
 * Log an action to the audit trail
 */
export async function logAuditEvent(
  c: Context<{ Bindings: Env }>,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const sql = neon(c.env.DATABASE_URL);

    // Extract client information
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null;
    const userAgent = c.req.header('user-agent') || null;

    await sql`
      INSERT INTO audit_logs (
        user_id,
        firm_id,
        action,
        resource_type,
        resource_id,
        ip_address,
        user_agent,
        metadata
      )
      VALUES (
        ${entry.user_id || null},
        ${entry.firm_id},
        ${entry.action},
        ${entry.resource_type},
        ${entry.resource_id || null},
        ${ipAddress},
        ${userAgent},
        ${entry.metadata ? JSON.stringify(entry.metadata) : null}
      )
    `;
  } catch (error) {
    // Don't fail the request if audit logging fails
    // But log the error for monitoring
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Log document upload
 */
export async function logDocumentUpload(
  c: Context<{ Bindings: Env }>,
  documentId: number,
  filename: string,
  fileSize: number,
  mimeType: string
): Promise<void> {
  const user = c.get('user') as UserContext;

  await logAuditEvent(c, {
    user_id: user.user_id,
    firm_id: user.firm_id,
    action: 'document_upload',
    resource_type: 'document',
    resource_id: documentId,
    metadata: {
      filename,
      file_size: fileSize,
      mime_type: mimeType,
    },
  });
}

/**
 * Log document download
 */
export async function logDocumentDownload(
  c: Context<{ Bindings: Env }>,
  documentId: number,
  filename: string
): Promise<void> {
  const user = c.get('user') as UserContext;

  await logAuditEvent(c, {
    user_id: user.user_id,
    firm_id: user.firm_id,
    action: 'document_download',
    resource_type: 'document',
    resource_id: documentId,
    metadata: {
      filename,
    },
  });
}

/**
 * Log document deletion
 */
export async function logDocumentDeletion(
  c: Context<{ Bindings: Env }>,
  documentId: number,
  filename: string
): Promise<void> {
  const user = c.get('user') as UserContext;

  await logAuditEvent(c, {
    user_id: user.user_id,
    firm_id: user.firm_id,
    action: 'document_delete',
    resource_type: 'document',
    resource_id: documentId,
    metadata: {
      filename,
    },
  });
}

/**
 * Log deal creation
 */
export async function logDealCreation(
  c: Context<{ Bindings: Env }>,
  dealId: number,
  dealName: string
): Promise<void> {
  const user = c.get('user') as UserContext;

  await logAuditEvent(c, {
    user_id: user.user_id,
    firm_id: user.firm_id,
    action: 'deal_create',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: {
      deal_name: dealName,
    },
  });
}

/**
 * Log deal update
 */
export async function logDealUpdate(
  c: Context<{ Bindings: Env }>,
  dealId: number,
  changes: Record<string, unknown>
): Promise<void> {
  const user = c.get('user') as UserContext;

  await logAuditEvent(c, {
    user_id: user.user_id,
    firm_id: user.firm_id,
    action: 'deal_update',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: {
      changes,
    },
  });
}

/**
 * Log workflow execution
 */
export async function logWorkflowExecution(
  c: Context<{ Bindings: Env }>,
  workflowId: number,
  workflowType: string,
  status: string
): Promise<void> {
  const user = c.get('user') as UserContext;

  await logAuditEvent(c, {
    user_id: user.user_id,
    firm_id: user.firm_id,
    action: 'workflow_execute',
    resource_type: 'workflow',
    resource_id: workflowId,
    metadata: {
      workflow_type: workflowType,
      status,
    },
  });
}

/**
 * Log authentication failure
 */
export async function logAuthFailure(
  c: Context<{ Bindings: Env }>,
  reason: string
): Promise<void> {
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

  await logAuditEvent(c, {
    firm_id: 'system', // System-level event
    action: 'auth_failure',
    resource_type: 'authentication',
    metadata: {
      reason,
      ip_address: ipAddress,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log access denied (authorization failure)
 */
export async function logAccessDenied(
  c: Context<{ Bindings: Env }>,
  resourceType: string,
  resourceId: number | null,
  reason: string
): Promise<void> {
  const user = c.get('user') as UserContext | undefined;

  await logAuditEvent(c, {
    user_id: user?.user_id,
    firm_id: user?.firm_id || 'system',
    action: 'access_denied',
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: {
      reason,
    },
  });
}

/**
 * Query audit logs
 */
export async function getAuditLogs(
  c: Context<{ Bindings: Env }>,
  options: {
    firmId?: string;
    userId?: number;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<unknown[]> {
  const sql = neon(c.env.DATABASE_URL);

  // Build dynamic query
  const conditions: string[] = [];
  const values: (string | number | Date)[] = [];
  let paramIndex = 1;

  if (options.firmId) {
    conditions.push(`firm_id = $${paramIndex++}`);
    values.push(options.firmId);
  }

  if (options.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    values.push(options.userId);
  }

  if (options.action) {
    conditions.push(`action = $${paramIndex++}`);
    values.push(options.action);
  }

  if (options.resourceType) {
    conditions.push(`resource_type = $${paramIndex++}`);
    values.push(options.resourceType);
  }

  if (options.startDate) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    values.push(options.startDate);
  }

  if (options.endDate) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    values.push(options.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 100;

  const query = `
    SELECT * FROM audit_logs
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  const result = await sql(query, values);
  return result;
}
