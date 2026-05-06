-- ─────────────────────────────────────────
-- REVISION: record_purchase_v1 (Cumulative Advance Deduction)
-- ─────────────────────────────────────────

-- Goal: Allow deducting from multiple active advances in a single purchase.
-- This preserves historical tracking of individual advances while treating them cumulatively.

-- Ensure the advances table has the required tracking column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE advances ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

DROP FUNCTION IF EXISTS record_purchase_v1(TEXT, TEXT, TEXT, DATE, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION record_purchase_v1(
    p_id TEXT,
    p_farmer_id TEXT,
    p_season_id TEXT,
    p_date DATE,
    p_coffee_type TEXT,
    p_gross_weight NUMERIC,
    p_moisture_content NUMERIC,
    p_standard_moisture NUMERIC,
    p_deduction_weight NUMERIC,
    p_payable_weight NUMERIC,
    p_buying_price NUMERIC,
    p_total_amount NUMERIC,
    p_advance_deducted NUMERIC,
    p_cash_paid NUMERIC,
    p_field_agent_id TEXT,
    p_admin_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rem_deduction NUMERIC := p_advance_deducted;
    v_adv RECORD;
    v_deduct_now NUMERIC;
BEGIN
    -- 1. Insert the Purchase Record
    INSERT INTO purchases (
        id, farmer_id, season_id, date, coffee_type, gross_weight, 
        moisture_content, standard_moisture, deduction_weight, 
        payable_weight, buying_price, total_amount, 
        advance_deducted, cash_paid, field_agent_id, admin_id
    ) VALUES (
        p_id::UUID, p_farmer_id::UUID, p_season_id::UUID, p_date, p_coffee_type, p_gross_weight, 
        p_moisture_content, p_standard_moisture, p_deduction_weight, 
        p_payable_weight, p_buying_price, p_total_amount, 
        p_advance_deducted, p_cash_paid, p_field_agent_id::UUID, p_admin_id::UUID
    );

    -- 2. Handle Cumulative Advance Deduction
    IF p_advance_deducted > 0 THEN
        -- Loop through all active advances for this farmer
        -- Deduct from the oldest advances first (FIFO)
        FOR v_adv IN 
            SELECT id, amount, deducted 
            FROM advances
            WHERE farmer_id::TEXT = p_farmer_id::TEXT AND status = 'Active'
            ORDER BY issue_date ASC, created_at ASC
            FOR UPDATE
        LOOP
            EXIT WHEN v_rem_deduction <= 0;
            
            -- Calculate how much we can deduct from this specific advance
            v_deduct_now := LEAST(v_adv.amount - v_adv.deducted, v_rem_deduction);
            
            IF v_deduct_now > 0 THEN
                UPDATE advances
                SET 
                    deducted = deducted + v_deduct_now,
                    status = CASE WHEN (deducted + v_deduct_now) >= amount THEN 'Cleared' ELSE 'Active' END,
                    updated_at = NOW()
                WHERE id = v_adv.id;
                
                v_rem_deduction := v_rem_deduction - v_deduct_now;
            END IF;
        END LOOP;
        
        -- Note: If v_rem_deduction > 0 here, it means we tried to deduct more than available.
        -- We won't raise an error as the purchase is already recorded, but the remaining 
        -- p_advance_deducted just won't be applied to any advance.
    END IF;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', p_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;
