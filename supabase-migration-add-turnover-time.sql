-- Add turnover_time column to cpt_codes table
-- Run this in your Supabase SQL Editor

-- Step 1: Add the turnover_time column (if it doesn't exist)
ALTER TABLE cpt_codes 
ADD COLUMN IF NOT EXISTS turnover_time INTEGER DEFAULT 30;

-- Step 2: Update existing records to have a default turnover time of 30 minutes
-- (Optional, but good for consistency so we don't have NULLs)
UPDATE cpt_codes 
SET turnover_time = 30 
WHERE turnover_time IS NULL;

-- Step 3: Verify the updates
SELECT code, description, average_duration, turnover_time
FROM cpt_codes 
ORDER BY category
LIMIT 5;
