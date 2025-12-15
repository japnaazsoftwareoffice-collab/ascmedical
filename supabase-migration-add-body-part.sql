-- Add body_part column to cpt_codes table
ALTER TABLE cpt_codes 
ADD COLUMN IF NOT EXISTS body_part TEXT;

-- Index for filtering by body part
CREATE INDEX IF NOT EXISTS idx_cpt_codes_body_part ON cpt_codes(body_part);
