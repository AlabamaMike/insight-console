/**
 * Documents API routes
 * Handles secure document upload/download with R2
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { neon } from '@neondatabase/serverless';
import { Env, UserContext } from '../types';
import { authenticate } from '../middleware/auth';
import { enforceDealAccess, enforceDocumentAccess } from '../middleware/firmIsolation';
import {
  RequestUploadSchema,
  UploadUrlResponse,
  DocumentResponse,
  DownloadUrlResponse,
} from '../schemas/document';
import { generateUploadUrl, generateDownloadUrl, validateFileType, deleteDocument } from '../utils/r2';
import { logDocumentUpload, logDocumentDownload, logDocumentDeletion } from '../utils/audit';
import { rateLimit, RATE_LIMITS } from '../middleware/rateLimit';

const documents = new Hono<{ Bindings: Env }>();

/**
 * POST /api/documents/request-upload - Request a presigned upload URL
 * Client will use this URL to upload directly to R2
 */
documents.post(
  '/request-upload',
  authenticate,
  rateLimit(RATE_LIMITS.UPLOAD),
  zValidator('json', RequestUploadSchema),
  async (c) => {
    const user = c.get('user') as UserContext;
    const data = c.req.valid('json');

    try {
      // Verify deal exists and user has access
      const sql = neon(c.env.DATABASE_URL);

      const dealResult = await sql`
        SELECT id, firm_id FROM deals
        WHERE id = ${data.deal_id} AND firm_id = ${user.firm_id}
      `;

      if (dealResult.length === 0) {
        return c.json({ error: 'Deal not found or access denied' }, 404);
      }

      // Validate file type
      if (!validateFileType(data.filename, data.mime_type)) {
        return c.json(
          {
            error: 'Invalid file type',
            message: 'File extension does not match MIME type',
          },
          400
        );
      }

      // Generate R2 upload URL
      const { url, key } = await generateUploadUrl(
        c.env,
        user.firm_id,
        data.deal_id,
        data.filename,
        data.mime_type
      );

      // Create document record in database
      const docResult = await sql`
        INSERT INTO documents (
          deal_id,
          filename,
          file_path,
          file_size,
          mime_type,
          uploaded_by_id
        )
        VALUES (
          ${data.deal_id},
          ${data.filename},
          ${key},
          ${data.file_size},
          ${data.mime_type},
          ${user.user_id}
        )
        RETURNING id
      `;

      const documentId = docResult[0].id as number;

      const response: UploadUrlResponse = {
        upload_url: url,
        document_id: documentId,
        r2_key: key,
        expires_in: 15 * 60, // 15 minutes
      };

      return c.json(response);
    } catch (error) {
      console.error('Error generating upload URL:', error);
      return c.json({ error: 'Failed to generate upload URL' }, 500);
    }
  }
);

/**
 * POST /api/documents/:id/confirm-upload - Confirm upload completed
 * Optional endpoint to verify upload and run post-processing
 */
documents.post('/:id/confirm-upload', authenticate, enforceDocumentAccess, async (c) => {
  const documentId = c.req.param('id');

  try {
    const sql = neon(c.env.DATABASE_URL);

    // Update document status or run any post-upload processing
    // For example, virus scanning, thumbnail generation, etc.

    // For now, just verify the document exists
    const result = await sql`
      SELECT * FROM documents WHERE id = ${parseInt(documentId)}
    `;

    if (result.length === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }

    const document = result[0] as DocumentResponse;

    // Log upload to audit trail
    await logDocumentUpload(
      c,
      document.id,
      document.filename,
      document.file_size,
      document.mime_type
    );

    return c.json({ message: 'Upload confirmed', document: result[0] });
  } catch (error) {
    console.error('Error confirming upload:', error);
    return c.json({ error: 'Failed to confirm upload' }, 500);
  }
});

/**
 * GET /api/documents/deal/:dealId - List documents for a deal
 */
documents.get('/deal/:dealId', authenticate, enforceDealAccess, async (c) => {
  const dealId = c.req.param('dealId');

  try {
    const sql = neon(c.env.DATABASE_URL);

    const result = await sql`
      SELECT * FROM documents
      WHERE deal_id = ${parseInt(dealId)}
      ORDER BY created_at DESC
    `;

    const docs = result as DocumentResponse[];

    return c.json(docs);
  } catch (error) {
    console.error('Error listing documents:', error);
    return c.json({ error: 'Failed to list documents' }, 500);
  }
});

/**
 * GET /api/documents/:id - Get document metadata
 */
documents.get('/:id', authenticate, enforceDocumentAccess, async (c) => {
  const documentId = c.req.param('id');

  try {
    const sql = neon(c.env.DATABASE_URL);

    const result = await sql`
      SELECT * FROM documents WHERE id = ${parseInt(documentId)}
    `;

    if (result.length === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }

    const document = result[0] as DocumentResponse;

    return c.json(document);
  } catch (error) {
    console.error('Error getting document:', error);
    return c.json({ error: 'Failed to get document' }, 500);
  }
});

/**
 * GET /api/documents/:id/download - Get presigned download URL
 */
documents.get('/:id/download', authenticate, rateLimit(RATE_LIMITS.DOWNLOAD), enforceDocumentAccess, async (c) => {
  const documentId = c.req.param('id');

  try {
    const sql = neon(c.env.DATABASE_URL);

    const result = await sql`
      SELECT * FROM documents WHERE id = ${parseInt(documentId)}
    `;

    if (result.length === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }

    const document = result[0] as DocumentResponse;

    // Generate presigned download URL
    const downloadUrl = await generateDownloadUrl(c.env, document.file_path);

    const response: DownloadUrlResponse = {
      download_url: downloadUrl,
      filename: document.filename,
      expires_in: 5 * 60, // 5 minutes
    };

    // Log download to audit trail
    await logDocumentDownload(c, document.id, document.filename);

    return c.json(response);
  } catch (error) {
    console.error('Error generating download URL:', error);
    return c.json({ error: 'Failed to generate download URL' }, 500);
  }
});

/**
 * DELETE /api/documents/:id - Delete document (soft delete)
 */
documents.delete('/:id', authenticate, enforceDocumentAccess, async (c) => {
  const documentId = c.req.param('id');
  const user = c.get('user') as UserContext;

  try {
    const sql = neon(c.env.DATABASE_URL);

    // Get document info
    const result = await sql`
      SELECT * FROM documents WHERE id = ${parseInt(documentId)}
    `;

    if (result.length === 0) {
      return c.json({ error: 'Document not found' }, 404);
    }

    const document = result[0] as DocumentResponse;

    // Soft delete in R2 (move to deleted/ prefix)
    // This will be automatically cleaned up after 30 days by lifecycle rule
    const deletedKey = `deleted/${document.file_path}`;

    // Get the object and copy to deleted prefix
    const object = await c.env.DOCUMENTS.get(document.file_path);
    if (object) {
      const data = await object.arrayBuffer();
      await c.env.DOCUMENTS.put(deletedKey, data, {
        httpMetadata: object.httpMetadata,
        customMetadata: {
          ...object.customMetadata,
          deletedAt: new Date().toISOString(),
          deletedBy: user.user_id.toString(),
        },
      });

      // Delete original
      await c.env.DOCUMENTS.delete(document.file_path);
    }

    // Delete database record
    await sql`
      DELETE FROM documents WHERE id = ${parseInt(documentId)}
    `;

    // Log deletion to audit trail
    await logDocumentDeletion(c, document.id, document.filename);

    return c.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return c.json({ error: 'Failed to delete document' }, 500);
  }
});

export default documents;
