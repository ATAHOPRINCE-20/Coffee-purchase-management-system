-- Fix for missing remaining_amount column in agent_capital_advances
-- Run this in the Supabase SQL Editor

ALTER TABLE agent_capital_advances ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC;

UPDATE agent_capital_advances 
SET remaining_amount = amount 
WHERE remaining_amount IS NULL;

ALTER TABLE agent_capital_advances ALTER COLUMN remaining_amount SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'remaining_amount_check') THEN
        ALTER TABLE agent_capital_advances ADD CONSTRAINT remaining_amount_check CHECK (remaining_amount >= 0);
    END IF;
END $$;
