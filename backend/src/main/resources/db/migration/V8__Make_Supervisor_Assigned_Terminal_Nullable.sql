-- V8: Make assigned_terminal_id nullable for supervisors since supervisors supervise across all SLPA port terminals
ALTER TABLE supervisors ALTER COLUMN assigned_terminal_id DROP NOT NULL;
