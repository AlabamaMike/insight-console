/**
 * Workflows API routes
 * Handles AI-powered analysis workflows
 */

import { Hono } from 'hono';
import { neon } from '@neondatabase/serverless';
import { Env, UserContext } from '../types';
import { authenticate } from '../middleware/auth';
import { enforceDealAccess, enforceWorkflowAccess } from '../middleware/firmIsolation';
import {
  StartAnalysisResponse,
  WorkflowResponse,
  WorkflowType,
  WorkflowStatus,
} from '../schemas/workflow';
import { logWorkflowExecution } from '../utils/audit';
import { rateLimit, RATE_LIMITS } from '../middleware/rateLimit';

const workflows = new Hono<{ Bindings: Env }>();

/**
 * POST /api/deals/:dealId/analysis/start - Start analysis for a deal
 * Extracts scope from documents and creates workflows
 */
workflows.post('/:dealId/analysis/start', authenticate, enforceDealAccess, async (c) => {
  const dealId = c.req.param('dealId');
  const user = c.get('user') as UserContext;

  try {
    const sql = neon(c.env.DATABASE_URL);

    // Get deal
    const dealResult = await sql`
      SELECT * FROM deals WHERE id = ${parseInt(dealId)}
    `;

    if (dealResult.length === 0) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    const deal = dealResult[0];

    // Get documents for this deal
    const documentsResult = await sql`
      SELECT * FROM documents WHERE deal_id = ${parseInt(dealId)}
    `;

    if (documentsResult.length === 0) {
      return c.json(
        {
          error: 'No documents uploaded',
          message: 'Please upload deal materials first.',
        },
        400
      );
    }

    // TODO: Extract text from documents in R2
    // For now, use a placeholder approach
    const scope = await extractScopeFromDocuments(
      c.env,
      documentsResult,
      deal.sector || 'Unknown',
      deal.deal_type || 'buyout'
    );

    // Update deal with extracted scope
    await sql`
      UPDATE deals
      SET
        key_questions = ${JSON.stringify(scope.key_questions)}::jsonb,
        hypotheses = ${JSON.stringify(scope.hypotheses)}::jsonb,
        status = 'analyzing',
        updated_at = NOW()
      WHERE id = ${parseInt(dealId)}
    `;

    // Create workflows based on recommendations
    for (const workflowType of scope.recommended_workflows) {
      await sql`
        INSERT INTO workflows (
          deal_id,
          workflow_type,
          status,
          input_data,
          output_data,
          started_by_id
        )
        VALUES (
          ${parseInt(dealId)},
          ${workflowType},
          'pending',
          '{}'::jsonb,
          '{}'::jsonb,
          ${user.user_id}
        )
      `;
    }

    const response: StartAnalysisResponse = {
      message: 'Analysis started. Workflows created.',
      deal_id: parseInt(dealId),
      status: 'analyzing',
      scope,
    };

    return c.json(response);
  } catch (error) {
    console.error('Error starting analysis:', error);
    return c.json({ error: 'Failed to start analysis' }, 500);
  }
});

/**
 * GET /api/deals/:dealId/analysis/workflows - List workflows for a deal
 */
workflows.get('/:dealId/analysis/workflows', authenticate, enforceDealAccess, async (c) => {
  const dealId = c.req.param('dealId');

  try {
    const sql = neon(c.env.DATABASE_URL);

    const result = await sql`
      SELECT * FROM workflows
      WHERE deal_id = ${parseInt(dealId)}
      ORDER BY created_at DESC
    `;

    const workflowList = result as unknown as WorkflowResponse[];

    return c.json(workflowList);
  } catch (error) {
    console.error('Error listing workflows:', error);
    return c.json({ error: 'Failed to list workflows' }, 500);
  }
});

/**
 * GET /api/workflows/:workflowId - Get workflow details
 */
workflows.get('/:workflowId', authenticate, enforceWorkflowAccess, async (c) => {
  const workflowId = c.req.param('workflowId');

  try {
    const sql = neon(c.env.DATABASE_URL);

    const result = await sql`
      SELECT * FROM workflows WHERE id = ${parseInt(workflowId)}
    `;

    if (result.length === 0) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    const workflow = result[0] as unknown as WorkflowResponse;

    return c.json(workflow);
  } catch (error) {
    console.error('Error getting workflow:', error);
    return c.json({ error: 'Failed to get workflow' }, 500);
  }
});

/**
 * POST /api/deals/:dealId/analysis/workflows/:workflowId/execute - Execute a workflow
 */
workflows.post(
  '/:dealId/analysis/workflows/:workflowId/execute',
  authenticate,
  rateLimit(RATE_LIMITS.WORKFLOW),
  enforceDealAccess,
  async (c) => {
    const dealId = c.req.param('dealId');
    const workflowId = c.req.param('workflowId');

    try {
      const sql = neon(c.env.DATABASE_URL);

      // Get workflow
      const workflowResult = await sql`
        SELECT * FROM workflows
        WHERE id = ${parseInt(workflowId)} AND deal_id = ${parseInt(dealId)}
      `;

      if (workflowResult.length === 0) {
        return c.json({ error: 'Workflow not found' }, 404);
      }

      const workflow = workflowResult[0];

      // Update status to running
      await sql`
        UPDATE workflows
        SET status = 'running', started_at = NOW(), updated_at = NOW()
        WHERE id = ${parseInt(workflowId)}
      `;

      // Execute workflow asynchronously
      // In production, this would be handled by a queue or background worker
      executeWorkflowAsync(
        c.env,
        parseInt(workflowId),
        workflow.workflow_type as string,
        parseInt(dealId)
      ).catch((error) => {
        console.error('Workflow execution error:', error);
      });

      // Log workflow execution
      await logWorkflowExecution(
        c,
        parseInt(workflowId),
        workflow.workflow_type as string,
        'running'
      );

      // Return updated workflow
      const updatedResult = await sql`
        SELECT * FROM workflows WHERE id = ${parseInt(workflowId)}
      `;

      const updatedWorkflow = updatedResult[0] as unknown as WorkflowResponse;

      return c.json(updatedWorkflow);
    } catch (error) {
      console.error('Error executing workflow:', error);
      return c.json({ error: 'Failed to execute workflow' }, 500);
    }
  }
);

/**
 * Helper: Extract scope from documents using Claude
 */
async function extractScopeFromDocuments(
  env: Env,
  documents: unknown[],
  sector: string,
  dealType: string
): Promise<{
  key_questions: string[];
  hypotheses: string[];
  recommended_workflows: string[];
}> {
  // TODO: Implement actual document text extraction from R2
  // TODO: Call Anthropic API to extract scope

  // Placeholder implementation
  return {
    key_questions: [
      'What is the competitive landscape?',
      'What are the unit economics?',
      'What is the total addressable market?',
    ],
    hypotheses: [
      'Strong market position in growing sector',
      'Scalable business model with improving margins',
      'Experienced management team',
    ],
    recommended_workflows: ['competitive_analysis', 'market_sizing', 'unit_economics'],
  };
}

/**
 * Helper: Execute workflow asynchronously
 */
async function executeWorkflowAsync(
  env: Env,
  workflowId: number,
  workflowType: string,
  dealId: number
): Promise<void> {
  const sql = neon(env.DATABASE_URL);

  try {
    // TODO: Implement actual workflow execution with Anthropic API
    // This would involve:
    // 1. Gathering context (documents, deal info)
    // 2. Calling Claude with appropriate prompts
    // 3. Processing and structuring results
    // 4. Updating workflow with findings

    // Placeholder: Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update workflow as completed
    await sql`
      UPDATE workflows
      SET
        status = 'completed',
        progress_percent = 100,
        findings = ${{
          summary: 'Analysis completed successfully',
          key_findings: ['Finding 1', 'Finding 2', 'Finding 3'],
        }}::jsonb,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${workflowId}
    `;
  } catch (error) {
    console.error('Workflow execution failed:', error);

    // Update workflow as failed
    await sql`
      UPDATE workflows
      SET
        status = 'failed',
        error_message = ${error instanceof Error ? error.message : 'Unknown error'},
        updated_at = NOW()
      WHERE id = ${workflowId}
    `;
  }
}

export default workflows;
