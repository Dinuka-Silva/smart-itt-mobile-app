-- =====================================================
-- V15: Add Trip Completion & Supervisor Confirmation Fields
-- =====================================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS discharge_bay VARCHAR(255);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS seal_status VARCHAR(100);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS damage_status VARCHAR(100);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_completion_notes TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS supervisor_id UUID;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(255);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
