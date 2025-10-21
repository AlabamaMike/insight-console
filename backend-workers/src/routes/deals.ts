/**
 * Deals API routes
 * CRUD operations for PE deal management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { neon } from '@neondatabase/serverless';
import { Env, UserContext } from '../types';
import { authenticate } from '../middleware/auth';
import { enforceDealAccess } from '../middleware/firmIsolation';
import { CreateDealSchema, UpdateDealSchema, DealResponse } from '../schemas/deal';

const deals = new Hono<{ Bindings: Env }>();

/**
 * POST /api/deals - Create a new deal
 */
deals.post('/', authenticate, zValidator('json', CreateDealSchema), async (c) => {
  const user = c.get('user') as UserContext;
  const data = c.req.valid('json');

  try {
    const sql = neon(c.env.DATABASE_URL);

    const result = await sql`
      INSERT INTO deals (
        name,
        target_company,
        sector,
        deal_type,
        status,
        created_by_id,
        firm_id,
        key_questions,
        hypotheses
      )
      VALUES (
        ${data.name},
        ${data.target_company || null},
        ${data.sector || null},
        ${data.deal_type || null},
        'draft',
        ${user.user_id},
        ${user.firm_id},
        '[]'::jsonb,
        '[]'::jsonb
      )
      RETURNING *
    `;

    const deal = result[0] as DealResponse;

    return c.json(deal, 201);
  } catch (error) {
    console.error('Error creating deal:', error);
    return c.json({ error: 'Failed to create deal' }, 500);
  }
});

/**
 * GET /api/deals - List all deals for user's firm
 */
deals.get('/', authenticate, async (c) => {
  const user = c.get('user') as UserContext;

  try {
    const sql = neon(c.env.DATABASE_URL);

    const result = await sql`
      SELECT * FROM deals
      WHERE firm_id = ${user.firm_id}
      ORDER BY created_at DESC
    `;

    const deals = result as DealResponse[];

    return c.json(deals);
  } catch (error) {
    console.error('Error listing deals:', error);
    return c.json({ error: 'Failed to list deals' }, 500);
  }
});

/**
 * GET /api/deals/:id - Get a specific deal
 */
deals.get('/:id', authenticate, enforceDealAccess, async (c) => {
  const dealId = c.req.param('id');

  try {
    const sql = neon(c.env.DATABASE_URL);

    const result = await sql`
      SELECT * FROM deals
      WHERE id = ${parseInt(dealId)}
    `;

    if (result.length === 0) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    const deal = result[0] as DealResponse;

    return c.json(deal);
  } catch (error) {
    console.error('Error getting deal:', error);
    return c.json({ error: 'Failed to get deal' }, 500);
  }
});

/**
 * PUT /api/deals/:id - Update a deal
 */
deals.put('/:id', authenticate, enforceDealAccess, zValidator('json', UpdateDealSchema), async (c) => {
  const dealId = c.req.param('id');
  const data = c.req.valid('json');

  try {
    const sql = neon(c.env.DATABASE_URL);

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | string[])[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.target_company !== undefined) {
      updates.push(`target_company = $${paramIndex++}`);
      values.push(data.target_company);
    }
    if (data.sector !== undefined) {
      updates.push(`sector = $${paramIndex++}`);
      values.push(data.sector);
    }
    if (data.deal_type !== undefined) {
      updates.push(`deal_type = $${paramIndex++}`);
      values.push(data.deal_type);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.key_questions !== undefined) {
      updates.push(`key_questions = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(data.key_questions));
    }
    if (data.hypotheses !== undefined) {
      updates.push(`hypotheses = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(data.hypotheses));
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE deals
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(parseInt(dealId));

    const result = await sql(query, values);

    if (result.length === 0) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    const deal = result[0] as DealResponse;

    return c.json(deal);
  } catch (error) {
    console.error('Error updating deal:', error);
    return c.json({ error: 'Failed to update deal' }, 500);
  }
});

/**
 * DELETE /api/deals/:id - Delete a deal (soft delete)
 */
deals.delete('/:id', authenticate, enforceDealAccess, async (c) => {
  const dealId = c.req.param('id');

  try {
    const sql = neon(c.env.DATABASE_URL);

    // Soft delete by setting status to archived
    const result = await sql`
      UPDATE deals
      SET status = 'archived', updated_at = NOW()
      WHERE id = ${parseInt(dealId)}
      RETURNING *
    `;

    if (result.length === 0) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    return c.json({ message: 'Deal archived successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return c.json({ error: 'Failed to delete deal' }, 500);
  }
});

export default deals;
