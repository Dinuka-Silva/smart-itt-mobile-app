-- V12: Add duration_minutes to trips table (nullable, add-only)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS duration_minutes BIGINT;
