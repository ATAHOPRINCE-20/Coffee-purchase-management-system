-- ─────────────────────────────────────────
-- REVERT CAPITAL ON DELETE TRIGGERS
-- ─────────────────────────────────────────

-- 1. Trigger Function to Revert Capital on Delete
CREATE OR REPLACE FUNCTION public.revert_capital_on_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id UUID;
    v_amount NUMERIC;
BEGIN
    v_admin_id := OLD.admin_id::uuid;

    IF TG_TABLE_NAME = 'purchases' THEN
        v_amount := OLD.cash_paid;
    ELSIF TG_TABLE_NAME = 'advances' THEN
        v_amount := OLD.amount;
    ELSIF TG_TABLE_NAME = 'expenses' THEN
        v_amount := OLD.amount;
    ELSE
        RETURN OLD;
    END IF;

    -- 1. Remove the transaction ledger entry from the ledger list
    DELETE FROM public.capital_ledger WHERE reference_id = OLD.id::uuid;

    -- 2. Refund the amount back to the admin's capital profile
    UPDATE public.company_profiles 
    SET capital = COALESCE(capital, 0) + v_amount 
    WHERE admin_id = v_admin_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach Delete Triggers
DROP TRIGGER IF EXISTS trg_purchase_capital_delete ON purchases;
CREATE TRIGGER trg_purchase_capital_delete
    AFTER DELETE ON purchases
    FOR EACH ROW EXECUTE PROCEDURE public.revert_capital_on_delete();

DROP TRIGGER IF EXISTS trg_advance_capital_delete ON advances;
CREATE TRIGGER trg_advance_capital_delete
    AFTER DELETE ON advances
    FOR EACH ROW EXECUTE PROCEDURE public.revert_capital_on_delete();

DROP TRIGGER IF EXISTS trg_expense_capital_delete ON expenses;
CREATE TRIGGER trg_expense_capital_delete
    AFTER DELETE ON expenses
    FOR EACH ROW EXECUTE PROCEDURE public.revert_capital_on_delete();
