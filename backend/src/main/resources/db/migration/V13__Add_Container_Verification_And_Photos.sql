-- V13: Add container verification fields, edit audit trail, and container photos table (add-only, nullable)

ALTER TABLE containers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100);
ALTER TABLE containers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS container_edits (
    id UUID PRIMARY KEY,
    container_id UUID,
    trip_id UUID,
    old_container_number VARCHAR(20),
    new_container_number VARCHAR(20),
    edited_by VARCHAR(100),
    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

CREATE TABLE IF NOT EXISTS container_photos (
    id UUID PRIMARY KEY,
    trip_id UUID NOT NULL,
    container_id UUID,
    container_number VARCHAR(20),
    file_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_status VARCHAR(20) DEFAULT 'PENDING',
    verified_by VARCHAR(100),
    verified_at TIMESTAMP,
    verification_note TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_by VARCHAR(100),
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_container_photos_trip ON container_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_container_photos_status ON container_photos(verification_status);
