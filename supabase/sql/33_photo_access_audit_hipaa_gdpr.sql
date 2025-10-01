-- Photo Access Audit Table
-- HIPAA/GDPR Compliance: Track all access to client photos
--
-- Run this in Supabase SQL Editor, then run: npx drizzle-kit pull

CREATE TABLE IF NOT EXISTS photo_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  photo_path TEXT NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Audit metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS photo_access_audit_user_id_idx
  ON photo_access_audit(user_id);

-- Index for contact queries (compliance reporting)
CREATE INDEX IF NOT EXISTS photo_access_audit_contact_id_idx
  ON photo_access_audit(contact_id);

-- Index for time-based queries (30-day reports, etc.)
CREATE INDEX IF NOT EXISTS photo_access_audit_accessed_at_idx
  ON photo_access_audit(accessed_at DESC);

-- Composite index for user + contact queries
CREATE INDEX IF NOT EXISTS photo_access_audit_user_contact_idx
  ON photo_access_audit(user_id, contact_id, accessed_at DESC);

-- Enable RLS
ALTER TABLE photo_access_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own audit logs
CREATE POLICY "Users can view their own photo access logs"
  ON photo_access_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: System can insert audit logs
CREATE POLICY "System can insert photo access logs"
  ON photo_access_audit
  FOR INSERT
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE photo_access_audit IS 'HIPAA/GDPR compliance: Audit trail for all client photo access';
COMMENT ON COLUMN photo_access_audit.user_id IS 'Practitioner who accessed the photo';
COMMENT ON COLUMN photo_access_audit.contact_id IS 'Client whose photo was accessed';
COMMENT ON COLUMN photo_access_audit.photo_path IS 'Storage path of the accessed photo';
COMMENT ON COLUMN photo_access_audit.accessed_at IS 'Timestamp of access (for compliance reporting)';
COMMENT ON COLUMN photo_access_audit.ip_address IS 'IP address of the request (optional, for security)';
COMMENT ON COLUMN photo_access_audit.user_agent IS 'Browser/device information (optional, for security)';
