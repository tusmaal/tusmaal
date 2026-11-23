ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS mux_upload_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mux_asset_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mux_playback_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mux_status VARCHAR(20) DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS mux_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS mux_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'lessons_mux_status_check'
      AND table_name = 'lessons'
  ) THEN
    ALTER TABLE lessons
      ADD CONSTRAINT lessons_mux_status_check
      CHECK (mux_status IN ('uploading', 'processing', 'ready', 'failed'));
  END IF;
END $$;

UPDATE lessons
SET mux_status = 'ready'
WHERE mux_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_mux_upload_id ON lessons(mux_upload_id);
CREATE INDEX IF NOT EXISTS idx_lessons_mux_asset_id ON lessons(mux_asset_id);
