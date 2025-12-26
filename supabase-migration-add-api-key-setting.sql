-- Add gemini_api_key column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
