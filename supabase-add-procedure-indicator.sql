-- Add procedure_indicator column to cpt_codes table
ALTER TABLE cpt_codes ADD COLUMN IF NOT EXISTS procedure_indicator TEXT;
