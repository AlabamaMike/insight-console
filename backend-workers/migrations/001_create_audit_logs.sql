-- Migration: Create audit logs table for security and compliance
-- Date: 2025-10-20
-- Description: Comprehensive audit trail for all user actions and document access

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  firm_id VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  resource_id INTEGER,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
-- Index for time-based queries (most common)
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Index for user-specific audit trails
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);

-- Index for firm-level audit queries
CREATE INDEX idx_audit_logs_firm ON audit_logs(firm_id, timestamp DESC);

-- Index for filtering by action type
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Index for resource lookups
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit log for all user actions. Retained for 7 years for compliance.';
COMMENT ON COLUMN audit_logs.timestamp IS 'Time when the action occurred';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_logs.firm_id IS 'Firm context for the action';
COMMENT ON COLUMN audit_logs.action IS 'Action type: upload, view, download, delete, update, create, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource: document, deal, workflow, user, etc.';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context: file_size, mime_type, workflow_type, etc.';
