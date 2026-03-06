-- Migration: Add Actual Surgery Times
-- This migration adds columns to track the actual timing of surgeries

ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS actual_start_time TEXT,
ADD COLUMN IF NOT EXISTS actual_end_time TEXT,
ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN surgeries.actual_start_time IS 'Actual time the surgery started';
COMMENT ON COLUMN surgeries.actual_end_time IS 'Actual time the surgery ended';
COMMENT ON COLUMN surgeries.actual_duration_minutes IS 'Calculated actual duration of the surgery in minutes';
