/**
 * Validation schemas for document endpoints
 */

import { z } from 'zod';

/**
 * Allowed MIME types for document uploads
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/msword', // .doc
  'application/vnd.ms-excel', // .xls
  'text/plain',
] as const;

/**
 * Maximum file size: 50MB
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Schema for requesting an upload URL
 */
export const RequestUploadSchema = z.object({
  deal_id: z.number().int().positive(),
  filename: z.string().min(1).max(255),
  mime_type: z.enum(ALLOWED_MIME_TYPES as unknown as [string, ...string[]]),
  file_size: z.number().int().positive().max(MAX_FILE_SIZE),
});

export type RequestUploadInput = z.infer<typeof RequestUploadSchema>;

/**
 * Upload URL response
 */
export interface UploadUrlResponse {
  upload_url: string;
  document_id: number;
  r2_key: string;
  expires_in: number; // seconds
}

/**
 * Document metadata response
 */
export interface DocumentResponse {
  id: number;
  deal_id: number;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by_id: number;
  created_at: string;
}

/**
 * Download URL response
 */
export interface DownloadUrlResponse {
  download_url: string;
  filename: string;
  expires_in: number; // seconds
}
