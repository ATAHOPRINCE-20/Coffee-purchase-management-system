-- ─────────────────────────────────────────
-- FIX: record_purchase_v1 Type Mismatch (Robust Version)
-- ─────────────────────────────────────────

-- First, drop the old function to avoid signature conflicts
DROP FUNCTION IF EXISTS record_purchase_v1(UUID, UUID, UUID, DATE, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID, UUID);

CREATE OR REPLACE FUNCTION record_purchase_v1(
    p_id TEXT, -- Changed to TEXT
    p_farmer_id TEXT, -- Changed to TEXT
    p_season_id TEXT, -- Changed to TEXT
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
    p_field_agent_id TEXT, -- Changed to TEXT
    p_admin_id TEXT -- Changed to TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_advance_id TEXT;
    v_advance_amount NUMERIC;
    v_advance_deducted NUMERIC;
    v_new_deducted NUMERIC;
    v_new_status TEXT;
BEGIN
    -- 1. Insert the Purchase Record
    -- We use explicit casting to UUID for columns where it's likely expected, 
    -- but Postgres handles TEXT -> UUID conversion automatically if formatted correctly.
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

    -- 2. Handle Advance Deduction (if applicable)
    IF p_advance_deducted > 0 THEN
        -- Find the active advance for this farmer
        -- Use explicit casting to TEXT for both sides to avoid "operator does not exist"
        SELECT id, amount, deducted INTO v_advance_id, v_advance_amount, v_advance_deducted
        FROM advances
        WHERE farmer_id::text = p_farmer_id::text AND status = 'Active'
        LIMIT 1
        FOR UPDATE;

        IF v_advance_id IS NOT NULL THEN
            v_new_deducted := v_advance_deducted + p_advance_deducted;
            
            -- Determine new status
            IF v_new_deducted >= v_advance_amount THEN
                v_new_status := 'Cleared';
            ELSE
                v_new_status := 'Active';
            END IF;

            -- Update the advance
            UPDATE advances
            SET 
                deducted = v_new_deducted,
                status = v_new_status
            WHERE id::text = v_advance_id::text;
        END IF;
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
