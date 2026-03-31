-- Add eudr_number column to farmers table
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS eudr_number TEXT;
