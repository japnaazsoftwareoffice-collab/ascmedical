-- Migration: Add OR Block Schedule Table
-- Run this SQL in your Supabase SQL Editor to add the new features

-- 1. Create Table
CREATE TABLE IF NOT EXISTS or_block_schedule (
  id BIGSERIAL PRIMARY KEY,
  room_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  week_of_month TEXT NOT NULL,
  provider_name TEXT,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_or_schedule_room ON or_block_schedule(room_name);
CREATE INDEX IF NOT EXISTS idx_or_schedule_day ON or_block_schedule(day_of_week);

-- 3. Insert Sample Data
INSERT INTO or_block_schedule (room_name, day_of_week, week_of_month, provider_name, start_time, end_time) VALUES
  ('OR 1', 'Monday', 'First', 'Burmiester', '1200', '1600'),
  ('OR 1', 'Monday', 'Second', 'Burmiester', '1200', '1600'),
  ('OR 1', 'Monday', 'Third', 'Burmiester', '1200', '1600'),
  ('OR 1', 'Monday', 'Fourth', 'Burmiester', '1200', '1600'),
  ('OR 1', 'Monday', 'Fifth', 'Burmiester', '1200', '1600'),
  ('OR 2', 'Monday', 'First', 'Prysi', '0730', '1300'),
  ('OR 2', 'Monday', 'Second', 'Prysi', '0730', '1300'),
  ('OR 2', 'Monday', 'Third', 'Prysi', '0730', '1300'),
  ('OR 2', 'Monday', 'Fourth', 'Prysi', '0730', '1300'),
  ('OR 2', 'Monday', 'Fifth', 'Prysi', '0730', '1300'),
  ('OR 1', 'Tuesday', 'First', 'McGee', '0730', '1600'),
  ('OR 2', 'Tuesday', 'First', 'Naples Plastic', '0730', '1600')
ON CONFLICT DO NOTHING;

-- 4. Enable RLS
ALTER TABLE or_block_schedule ENABLE ROW LEVEL SECURITY;

-- 5. Create Policy
-- We drop it first just in case it was partially created
DROP POLICY IF EXISTS "Enable all operations for or_block_schedule" ON or_block_schedule;
CREATE POLICY "Enable all operations for or_block_schedule" ON or_block_schedule FOR ALL USING (true) WITH CHECK (true);

-- 6. Create Trigger
DROP TRIGGER IF EXISTS update_or_block_schedule_updated_at ON or_block_schedule;
CREATE TRIGGER update_or_block_schedule_updated_at BEFORE UPDATE ON or_block_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
