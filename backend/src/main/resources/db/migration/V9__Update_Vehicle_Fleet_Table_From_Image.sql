-- =========================================================================
-- V9: Update vehicle numbers and CHE numbers according to verified fleet list
-- =========================================================================

-- Clean up older vehicle mappings if needed
DELETE FROM vehicles WHERE vehicle_number IN ('LY 5234', 'LY 5235', 'LY 5236', 'LY 5237', 'LY 5238', 'LY 5217');

INSERT INTO vehicles (id, vehicle_number, chassis_number, operator, trailer_size, status, created_at, updated_at)
VALUES
    -- SCK Logistics (17 vehicles: CHE 100-114, 126, 127)
    (gen_random_uuid(), 'LY-6439', 'CHE 100', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6434', 'CHE 101', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6435', 'CHE 102', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6431', 'CHE 103', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6427', 'CHE 104', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-5665', 'CHE 105', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-5708', 'CHE 106', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-5711', 'CHE 107', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-5717', 'CHE 108', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-5721', 'CHE 109', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6426', 'CHE 110', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6428', 'CHE 111', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6438', 'CHE 112', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6429', 'CHE 113', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6433', 'CHE 114', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-5654', 'CHE 126', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-2147', 'CHE 127', 'SCK Logistics', '40FT', 'ACTIVE', NOW(), NOW()),

    -- SDR LINK (5 vehicles: CHE 115, 117, 119, 120, 121)
    (gen_random_uuid(), 'LY-6528', 'CHE 115', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6529', 'CHE 117', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6530', 'CHE 119', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6531', 'CHE 120', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW()),
    (gen_random_uuid(), 'LY-6532', 'CHE 121', 'SDR LINK', '40FT', 'ACTIVE', NOW(), NOW())

ON CONFLICT (vehicle_number) DO UPDATE
SET chassis_number = EXCLUDED.chassis_number,
    operator = EXCLUDED.operator,
    trailer_size = EXCLUDED.trailer_size,
    updated_at = NOW();

-- Update demo driver default vehicle
UPDATE drivers
SET vehicle_number = 'LY-6439', chassis_number = 'CHE 100'
WHERE driver_code = 'DRV-00001' OR username = 'DRV-00001';
