-- Add new columns to cpt_codes to support ASC ADDENDA data
-- This allows us to store the full richness of the CMS data

ALTER TABLE cpt_codes
ADD COLUMN IF NOT EXISTS short_descriptor TEXT,
ADD COLUMN IF NOT EXISTS long_descriptor TEXT,
ADD COLUMN IF NOT EXISTS payment_indicator TEXT,
ADD COLUMN IF NOT EXISTS effective_date DATE,
ADD COLUMN IF NOT EXISTS termination_date DATE,
ADD COLUMN IF NOT EXISTS version_year TEXT,
ADD COLUMN IF NOT EXISTS last_updated_from_source TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS details JSONB;

-- Index for faster upserts/lookups
CREATE INDEX IF NOT EXISTS idx_cpt_codes_effective_date ON cpt_codes(effective_date);
