-- ─────────────────────────────────────────
-- ADD UNIT PRICE TO AGENT SETTLEMENTS
-- ─────────────────────────────────────────

-- 1. Add unit_price column to agent_settlements
ALTER TABLE agent_settlements ADD COLUMN IF NOT EXISTS unit_price numeric;

-- (Optional) Update existing records if any (not needed for now)
