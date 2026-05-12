-- Add a generated column `remaining` to advances table
-- This ensures consistent computed balance everywhere without relying on application-side math

ALTER TABLE advances ADD COLUMN IF NOT EXISTS remaining NUMERIC 
  GENERATED ALWAYS AS (GREATEST(0, amount - deducted)) STORED;
