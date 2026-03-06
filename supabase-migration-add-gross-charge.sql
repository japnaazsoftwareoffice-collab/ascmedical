-- Add gross_charge column to cpt_codes
ALTER TABLE cpt_codes
ADD COLUMN IF NOT EXISTS gross_charge DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN cpt_codes.gross_charge IS 'Gross charge (e.g., 350% of Medicare rate)';
