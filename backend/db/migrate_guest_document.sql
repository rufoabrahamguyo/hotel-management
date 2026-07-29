-- Guest passport / ID scan file path (relative under backend/uploads).
ALTER TABLE guest ADD COLUMN IF NOT EXISTS document_file VARCHAR(512);
ALTER TABLE guest ADD COLUMN IF NOT EXISTS document_file_name VARCHAR(255);
