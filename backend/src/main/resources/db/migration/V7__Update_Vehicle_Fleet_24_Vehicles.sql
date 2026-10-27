-- =========================================================================
-- V7: Update and expand SCK Fleet to 20 vehicles with Trailer Size (40FT)
-- =========================================================================

-- 1. Ensure trailer_size column exists in vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS trailer_size VARCHAR(20) DEFAULT '40FT';

-- 2. Upsert the authoritative 20 Fleet Vehicles
-- Operator 1: SCK Logistics (15 vehicles: CHE 100 - 114)
INSERT INTO vehicles (id, vehicle_number, chassis_number, operator, trailer_size, status, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'LY 5234', 'SCK 100', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5235', 'SCK 101', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5236', 'SCK 102', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5237', 'SCK 103', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5238', 'SCK 104', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5665', 'SCK 105', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5708', 'SCK 106', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5711', 'SCK 107', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5717', 'SCK 108', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5721', 'SCK 109', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 6426', 'SCK 110', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 6428', 'SCK 111', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 5217', 'SCK 112', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 6429', 'SCK 113', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 6433', 'SCK 114', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),

-- Operator 2: SDR LINK (5 vehicles: CHE 115, 117, 119, 120, 121)
    (gen_random_uuid(), 'LY 6528', 'SCK 115', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 6529', 'SCK 117', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 6530', 'SCK 119', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 6531', 'SCK 120', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY 6532', 'SCK 121', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW())

ON CONFLICT (vehicle_number) DO UPDATE
SET chassis_number = EXCLUDED.chassis_number,
    operator = EXCLUDED.operator,
    trailer_size = EXCLUDED.trailer_size,
    updated_at = NOW();
