-- =====================================================
-- V10: Add ADMIN role support + audit_logs table
-- =====================================================

-- Add port_pass_expiry columns if not present
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_port_pass_expiry DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_port_pass_expiry DATE;

-- Add supervisor port pass expiry if not present
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS supervisor_port_pass_expiry DATE;

-- Audit logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    actor_role VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
