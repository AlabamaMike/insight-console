/**
 * Firm isolation middleware
 * Ensures users can only access resources belonging to their firm
 */

import { Context, Next } from 'hono';
import { Env, UserContext } from '../types';
import { neon } from '@neondatabase/serverless';

/**
 * Enforce firm isolation for deal resources
 * Validates that the deal belongs to the user's firm
 */
export async function enforceDealAccess(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as UserContext | undefined;

  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
  }

  const dealId = c.req.param('id') || c.req.param('dealId');

  if (!dealId) {
    return c.json({ error: 'Bad Request', message: 'Deal ID required' }, 400);
  }

  try {
    // Query database to verify deal ownership
    const sql = neon(c.env.DATABASE_URL);
    const result = await sql`
      SELECT firm_id FROM deals WHERE id = ${parseInt(dealId)}
    `;

    if (result.length === 0) {
      return c.json({ error: 'Not Found', message: 'Deal not found' }, 404);
    }

    const deal = result[0];

    if (deal.firm_id !== user.firm_id) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Access denied. This deal belongs to a different firm.',
        },
        403
      );
    }

    // Store deal info in context for use by route handlers
    c.set('dealFirmId', deal.firm_id as string);

    await next();
  } catch (error) {
    console.error('Firm isolation check failed:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}

/**
 * Enforce firm isolation for document resources
 * Validates that the document's deal belongs to the user's firm
 */
export async function enforceDocumentAccess(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as UserContext | undefined;

  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
  }

  const documentId = c.req.param('id') || c.req.param('documentId');

  if (!documentId) {
    return c.json({ error: 'Bad Request', message: 'Document ID required' }, 400);
  }

  try {
    // Query database to verify document ownership through deal
    const sql = neon(c.env.DATABASE_URL);
    const result = await sql`
      SELECT d.firm_id
      FROM documents doc
      JOIN deals d ON doc.deal_id = d.id
      WHERE doc.id = ${parseInt(documentId)}
    `;

    if (result.length === 0) {
      return c.json({ error: 'Not Found', message: 'Document not found' }, 404);
    }

    const document = result[0];

    if (document.firm_id !== user.firm_id) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Access denied. This document belongs to a different firm.',
        },
        403
      );
    }

    await next();
  } catch (error) {
    console.error('Firm isolation check failed:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}

/**
 * Enforce firm isolation for workflow resources
 * Validates that the workflow's deal belongs to the user's firm
 */
export async function enforceWorkflowAccess(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as UserContext | undefined;

  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
  }

  const workflowId = c.req.param('id') || c.req.param('workflowId');

  if (!workflowId) {
    return c.json({ error: 'Bad Request', message: 'Workflow ID required' }, 400);
  }

  try {
    // Query database to verify workflow ownership through deal
    const sql = neon(c.env.DATABASE_URL);
    const result = await sql`
      SELECT d.firm_id
      FROM workflows w
      JOIN deals d ON w.deal_id = d.id
      WHERE w.id = ${parseInt(workflowId)}
    `;

    if (result.length === 0) {
      return c.json({ error: 'Not Found', message: 'Workflow not found' }, 404);
    }

    const workflow = result[0];

    if (workflow.firm_id !== user.firm_id) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Access denied. This workflow belongs to a different firm.',
        },
        403
      );
    }

    await next();
  } catch (error) {
    console.error('Firm isolation check failed:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}

/**
 * Generic firm isolation enforcement
 * Can be used for any resource type
 */
export function enforceFirmIsolation(resourceType: string, idParam: string = 'id') {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as UserContext | undefined;

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
    }

    const resourceId = c.req.param(idParam);

    if (!resourceId) {
      return c.json({ error: 'Bad Request', message: `${resourceType} ID required` }, 400);
    }

    try {
      const sql = neon(c.env.DATABASE_URL);

      // Query varies by resource type
      let result;
      switch (resourceType) {
        case 'deal':
          result = await sql`SELECT firm_id FROM deals WHERE id = ${parseInt(resourceId)}`;
          break;
        case 'document':
          result = await sql`
            SELECT d.firm_id FROM documents doc
            JOIN deals d ON doc.deal_id = d.id
            WHERE doc.id = ${parseInt(resourceId)}
          `;
          break;
        case 'workflow':
          result = await sql`
            SELECT d.firm_id FROM workflows w
            JOIN deals d ON w.deal_id = d.id
            WHERE w.id = ${parseInt(resourceId)}
          `;
          break;
        default:
          return c.json({ error: 'Internal Server Error', message: 'Unknown resource type' }, 500);
      }

      if (result.length === 0) {
        return c.json({ error: 'Not Found', message: `${resourceType} not found` }, 404);
      }

      const resource = result[0];

      if (resource.firm_id !== user.firm_id) {
        return c.json(
          {
            error: 'Forbidden',
            message: `Access denied. This ${resourceType} belongs to a different firm.`,
          },
          403
        );
      }

      await next();
    } catch (error) {
      console.error('Firm isolation check failed:', error);
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  };
}
