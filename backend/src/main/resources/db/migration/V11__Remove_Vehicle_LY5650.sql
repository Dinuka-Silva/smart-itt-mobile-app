-- =========================================================================
-- V11: Remove vehicle LY-5650 (SCK 125) from fleet and update driver records
-- =========================================================================

UPDATE drivers SET vehicle_id = NULL WHERE vehicle_id IN (SELECT id FROM vehicles WHERE vehicle_number = 'LY-5650');
UPDATE drivers SET vehicle_number = NULL, chassis_number = NULL WHERE vehicle_number = 'LY-5650';
DELETE FROM vehicles WHERE vehicle_number = 'LY-5650';
