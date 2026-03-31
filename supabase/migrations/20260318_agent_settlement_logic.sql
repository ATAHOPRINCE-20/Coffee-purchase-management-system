-- ─────────────────────────────────────────
-- AGENT CAPITAL SETTLEMENT LOGIC
-- ─────────────────────────────────────────

-- 1. Update agent_capital_advances to track partial settlements
ALTER TABLE agent_capital_advances ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC;

-- Backfill remaining_amount for existing records if it's null
UPDATE agent_capital_advances 
SET remaining_amount = amount 
WHERE remaining_amount IS NULL;

-- Ensure remaining_amount is NOT NULL for future records
ALTER TABLE agent_capital_advances ALTER COLUMN remaining_amount SET NOT NULL;
ALTER TABLE agent_capital_advances ADD CONSTRAINT remaining_amount_check CHECK (remaining_amount >= 0);

-- 2. Create agent_settlements table (Logs the "Receive Coffee" event)
CREATE TABLE IF NOT EXISTS agent_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    agent_id UUID NOT NULL REFERENCES profiles(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    weight NUMERIC DEFAULT 0,
    coffee_type TEXT,
    notes TEXT,
    settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS for settlements
ALTER TABLE agent_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_agent_settlements" ON agent_settlements
    FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "agents_view_own_settlements" ON agent_settlements
    FOR SELECT USING (agent_id = auth.uid());

-- 4. Atomic Settlement Function
CREATE OR REPLACE FUNCTION record_agent_settlement_v1(
    p_admin_id UUID,
    p_agent_id UUID,
    p_amount NUMERIC,
    p_weight NUMERIC DEFAULT 0,
    p_coffee_type TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining_to_settle NUMERIC := p_amount;
    v_advance RECORD;
    v_deduct NUMERIC;
    v_settlement_id UUID;
BEGIN
    -- 1. Record the settlement entry
    INSERT INTO agent_settlements (
        admin_id, agent_id, amount, weight, coffee_type, notes
    ) VALUES (
        p_admin_id, p_agent_id, p_amount, p_weight, p_coffee_type, p_notes
    ) RETURNING id INTO v_settlement_id;

    -- 2. Loop through active advances for this agent and deduct
    -- We settle the oldest advances first (FIFO)
    FOR v_advance IN 
        SELECT id, remaining_amount 
        FROM agent_capital_advances 
        WHERE agent_id = p_agent_id AND status = 'Active'
        ORDER BY issue_date ASC, created_at ASC
        FOR UPDATE
    LOOP
        IF v_remaining_to_settle <= 0 THEN
            EXIT;
        END IF;

        IF v_advance.remaining_amount <= v_remaining_to_settle THEN
            -- Fully settle this advance
            v_deduct := v_advance.remaining_amount;
            UPDATE agent_capital_advances 
            SET remaining_amount = 0, status = 'Settled' 
            WHERE id = v_advance.id;
            v_remaining_to_settle := v_remaining_to_settle - v_deduct;
        ELSE
            -- Partially settle this advance
            UPDATE agent_capital_advances 
            SET remaining_amount = remaining_amount - v_remaining_to_settle
            WHERE id = v_advance.id;
            v_remaining_to_settle := 0;
        END IF;
    END LOOP;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'settlement_id', v_settlement_id,
        'remaining_to_settle', v_remaining_to_settle
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;
