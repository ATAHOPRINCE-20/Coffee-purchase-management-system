-- 0. Update Table Schema
ALTER TABLE agent_settlements ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;

CREATE OR REPLACE FUNCTION record_agent_settlement_v1(
  p_agent_id uuid,
  p_admin_id uuid,
  p_amount numeric,
  p_weight numeric,
  p_unit_price numeric,  -- NEW PARAMETER
  p_coffee_type text,
  p_notes text DEFAULT NULL
) 
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining_to_settle numeric := p_amount;
  v_advance_id uuid;
  v_advance_remaining numeric;
  v_amount_to_deduct numeric;
BEGIN
  -- 1. Log the settlement event
  INSERT INTO agent_settlements (
    agent_id,
    admin_id,
    amount,
    weight,
    unit_price,       -- NEW COLUMN
    coffee_type,
    notes
  ) VALUES (
    p_agent_id,
    p_admin_id,
    p_amount,
    p_weight,
    p_unit_price,     -- NEW VALUE
    p_coffee_type,
    p_notes
  );

  -- 2. Deduct from active advances sequentially (FIFO)
  WHILE v_remaining_to_settle > 0 LOOP
    -- Find the oldest active advance for this agent/admin pair
    SELECT id, remaining_amount INTO v_advance_id, v_advance_remaining
    FROM agent_capital_advances
    WHERE agent_id = p_agent_id 
      AND admin_id = p_admin_id
      AND status = 'Active'
      AND remaining_amount > 0
    ORDER BY issue_date ASC
    LIMIT 1;

    -- If no more active advances, exit loop
    IF v_advance_id IS NULL THEN
      EXIT;
    END IF;

    -- Determine how much to deduct from THIS advance
    IF v_advance_remaining <= v_remaining_to_settle THEN
      v_amount_to_deduct := v_advance_remaining;
    ELSE
      v_amount_to_deduct := v_remaining_to_settle;
    END IF;

    -- Update the advance
    UPDATE agent_capital_advances
    SET 
      remaining_amount = remaining_amount - v_amount_to_deduct,
      status = CASE WHEN remaining_amount - v_amount_to_deduct <= 0 THEN 'Settled' ELSE 'Active' END
    WHERE id = v_advance_id;

    -- Update remaining to settle
    v_remaining_to_settle := v_remaining_to_settle - v_amount_to_deduct;

  END LOOP;

  -- 3. If there's still amount left (agent brought more coffee than advance debt),
  -- it just stays logged in agent_settlements but advances are all settled.
END;
$$;
