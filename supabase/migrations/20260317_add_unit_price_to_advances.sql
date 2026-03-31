-- Add unit_price column to advances table
ALTER TABLE advances ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
