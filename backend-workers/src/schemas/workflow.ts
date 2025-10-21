/**
 * Validation schemas for workflow endpoints
 */

import { z } from 'zod';

/**
 * Workflow type enum
 */
export const WorkflowTypeSchema = z.enum([
  'competitive_analysis',
  'market_sizing',
  'unit_economics',
  'management_assessment',
  'financial_benchmarking',
]);
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;

/**
 * Workflow status enum
 */
export const WorkflowStatusSchema = z.enum(['pending', 'running', 'paused', 'completed', 'failed']);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

/**
 * Schema for starting analysis
 */
export const StartAnalysisSchema = z.object({
  // No body needed - deal_id comes from URL
});

/**
 * Start analysis response
 */
export interface StartAnalysisResponse {
  message: string;
  deal_id: number;
  status: string;
  scope: {
    key_questions: string[];
    hypotheses: string[];
    recommended_workflows: string[];
  };
}

/**
 * Workflow response
 */
export interface WorkflowResponse {
  id: number;
  deal_id: number;
  workflow_type: WorkflowType;
  status: WorkflowStatus;
  progress_percent: number;
  current_step: string | null;
  findings: Record<string, unknown>;
  sources: unknown[];
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Execute workflow schema
 */
export const ExecuteWorkflowSchema = z.object({
  // No body needed - workflow_id comes from URL
});
