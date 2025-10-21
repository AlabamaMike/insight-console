/**
 * Validation schemas for deal endpoints
 * Using Zod for runtime validation
 */

import { z } from 'zod';

/**
 * Deal status enum
 */
export const DealStatusSchema = z.enum(['draft', 'analyzing', 'synthesis', 'ready', 'archived']);
export type DealStatus = z.infer<typeof DealStatusSchema>;

/**
 * Deal type enum
 */
export const DealTypeSchema = z.enum(['buyout', 'growth', 'add-on']);
export type DealType = z.infer<typeof DealTypeSchema>;

/**
 * Schema for creating a new deal
 */
export const CreateDealSchema = z.object({
  name: z.string().min(1, 'Deal name is required').max(200),
  target_company: z.string().max(200).optional(),
  sector: z.string().max(100).optional(),
  deal_type: DealTypeSchema.optional(),
});

export type CreateDealInput = z.infer<typeof CreateDealSchema>;

/**
 * Schema for updating a deal
 */
export const UpdateDealSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  target_company: z.string().max(200).optional(),
  sector: z.string().max(100).optional(),
  deal_type: DealTypeSchema.optional(),
  status: DealStatusSchema.optional(),
  key_questions: z.array(z.string()).optional(),
  hypotheses: z.array(z.string()).optional(),
});

export type UpdateDealInput = z.infer<typeof UpdateDealSchema>;

/**
 * Deal response type
 */
export interface DealResponse {
  id: number;
  name: string;
  target_company: string | null;
  sector: string | null;
  deal_type: string | null;
  status: DealStatus;
  key_questions: string[];
  hypotheses: string[];
  created_by_id: number;
  firm_id: string;
  created_at: string;
  updated_at: string | null;
}
