-- ─────────────────────────────────────────
-- ADMIN CAPITAL MANAGEMENT
-- ─────────────────────────────────────────

-- 1. Add capital column to company_profiles
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS capital NUMERIC DEFAULT 0;

-- 2. Create capital_ledger table
CREATE TABLE IF NOT EXISTS capital_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Top-up', 'Purchase', 'Advance', 'Expense', 'Adjustment')),
    reference_id UUID, -- ID of the purchase, advance, or expense
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS on capital_ledger
ALTER TABLE capital_ledger ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for capital_ledger
DROP POLICY IF EXISTS "admins_manage_own_ledger" ON capital_ledger;
CREATE POLICY "admins_manage_own_ledger" ON capital_ledger
    FOR ALL USING (admin_id = get_my_admin_id());

-- 5. Trigger Function to Update Capital Balance
CREATE OR REPLACE FUNCTION public.update_capital_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id UUID;
    v_amount NUMERIC;
    v_type TEXT;
    v_notes TEXT;
BEGIN
    -- Standardize Admin ID for all tables
    v_admin_id := NEW.admin_id::uuid;

    -- Determine Amount and Notes based on table
    IF TG_TABLE_NAME = 'purchases' THEN
        v_amount := -NEW.cash_paid;
        v_type := 'Purchase';
        v_notes := 'Coffee Purchase (' || NEW.coffee_type || ')';
    ELSIF TG_TABLE_NAME = 'advances' THEN
        v_amount := -NEW.amount;
        v_type := 'Advance';
        v_notes := 'Farmer Advance';
    ELSIF TG_TABLE_NAME = 'expenses' THEN
        v_amount := -NEW.amount;
        v_type := 'Expense';
        v_notes := COALESCE(NEW.category, 'General Expense');
    ELSIF TG_TABLE_NAME = 'capital_ledger' THEN
        -- This handles manual top-ups or adjustments added directly to the ledger
        -- Update the balance only if the profile exists. If it doesn't, we still log the ledger.
        UPDATE company_profiles 
        SET capital = COALESCE(capital, 0) + NEW.amount 
        WHERE admin_id = v_admin_id;
        RETURN NEW;
    END IF;

    -- For Purchase/Advance/Expense, we log to ledger which then updates balance via the trigger above
    IF TG_TABLE_NAME != 'capital_ledger' THEN
        INSERT INTO capital_ledger (admin_id, amount, type, reference_id, notes)
        VALUES (v_admin_id, v_amount, v_type, NEW.id::uuid, v_notes);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Triggers
DROP TRIGGER IF EXISTS trg_purchase_capital ON purchases;
CREATE TRIGGER trg_purchase_capital
    AFTER INSERT ON purchases
    FOR EACH ROW EXECUTE PROCEDURE public.update_capital_on_transaction();

DROP TRIGGER IF EXISTS trg_advance_capital ON advances;
CREATE TRIGGER trg_advance_capital
    AFTER INSERT ON advances
    FOR EACH ROW EXECUTE PROCEDURE public.update_capital_on_transaction();

DROP TRIGGER IF EXISTS trg_expense_capital ON expenses;
CREATE TRIGGER trg_expense_capital
    AFTER INSERT ON expenses
    FOR EACH ROW EXECUTE PROCEDURE public.update_capital_on_transaction();

DROP TRIGGER IF EXISTS trg_ledger_update_balance ON capital_ledger;
CREATE TRIGGER trg_ledger_update_balance
    AFTER INSERT ON capital_ledger
    FOR EACH ROW EXECUTE PROCEDURE public.update_capital_on_transaction();

-- 7. Add Indices
CREATE INDEX IF NOT EXISTS idx_ledger_admin ON capital_ledger(admin_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON capital_ledger(type);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON capital_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON capital_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_admin_created ON capital_ledger(admin_id, created_at DESC);
