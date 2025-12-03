-- Add date column to or_block_schedule to support specific date blocks
ALTER TABLE or_block_schedule ADD COLUMN IF NOT EXISTS date DATE;

-- Make day_of_week and week_of_month optional (nullable) since we are using specific dates
ALTER TABLE or_block_schedule ALTER COLUMN day_of_week DROP NOT NULL;
ALTER TABLE or_block_schedule ALTER COLUMN week_of_month DROP NOT NULL;
