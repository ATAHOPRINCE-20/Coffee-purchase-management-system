-- ─────────────────────────────────────────
-- ACID TRANSACTIONS (ATOMIC PURCHASES)
-- ─────────────────────────────────────────

/**
 * record_purchase_v1
 * This function ensures that creating a purchase and updating a farmer's 
 * advance balance happens in a SINGLE atomic transaction.
 *
 * ACID Compliance:
 * - Atomicity: Entire operation succeeds or fails.
 * - Consistency: Balances are updated correctly.
 * - Isolation: Parallel purchases won't overwrite balances incorrectly.
 */
CREATE OR REPLACE FUNCTION record_purchase_v1(
    p_id UUID,
    p_farmer_id UUID,
    p_season_id UUID,
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
    p_field_agent_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions to ensure consistency
AS $$
DECLARE
    v_advance_id UUID;
    v_advance_amount NUMERIC;
    v_advance_deducted NUMERIC;
    v_new_deducted NUMERIC;
    v_new_status TEXT;
BEGIN
    -- 1. Insert the Purchase Record
    INSERT INTO purchases (
        id, farmer_id, season_id, date, coffee_type, gross_weight, 
        moisture_content, standard_moisture, deduction_weight, 
        payable_weight, buying_price, total_amount, 
        advance_deducted, cash_paid, field_agent_id, admin_id
    ) VALUES (
        p_id, p_farmer_id, p_season_id, p_date, p_coffee_type, p_gross_weight, 
        p_moisture_content, p_standard_moisture, p_deduction_weight, 
        p_payable_weight, p_buying_price, p_total_amount, 
        p_advance_deducted, p_cash_paid, p_field_agent_id, p_admin_id
    );

    -- 2. Handle Advance Deduction (if applicable)
    IF p_advance_deducted > 0 THEN
        -- Find the active advance for this farmer
        SELECT id, amount, deducted INTO v_advance_id, v_advance_amount, v_advance_deducted
        FROM advances
        WHERE farmer_id = p_farmer_id AND status = 'Active'
        LIMIT 1
        FOR UPDATE; -- Lock the row for consistency

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
                status = v_new_status,
                updated_at = NOW()
            WHERE id = v_advance_id;
        ELSE
            -- Optional: If no advance found but deduction requested, we could raise an error
            -- RAISE EXCEPTION 'No active advance found for this farmer';
        END IF;
    END IF;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', p_id
    );

EXCEPTION WHEN OTHERS THEN
    -- In PostgreSQL, any error inside a function automatically rolls back the transaction.
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;
