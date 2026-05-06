-- ─────────────────────────────────────────
-- FARMER DEBTS & PAYMENTS
-- ─────────────────────────────────────────

-- 1. Create farmer_payments table
-- farmer_id is TEXT to match farmers.id
-- admin_id is UUID to match profiles.id
-- purchase_id is UUID to match purchases.id
CREATE TABLE IF NOT EXISTS farmer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id TEXT REFERENCES farmers(id) NOT NULL,
    purchase_id TEXT REFERENCES purchases(id), -- Optional: Link to a specific purchase
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    admin_id UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE farmer_payments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "admins_manage_farmer_payments" ON farmer_payments;
CREATE POLICY "admins_manage_farmer_payments" ON farmer_payments
    FOR ALL USING (admin_id = get_my_admin_id());

DROP POLICY IF EXISTS "agents_view_farmer_payments" ON farmer_payments;
CREATE POLICY "agents_view_farmer_payments" ON farmer_payments
    FOR SELECT USING (admin_id = get_my_admin_id());

-- 4. Create View for Farmer Debt Summary
-- This calculates total debt (purchases - payments - advances deducted)
CREATE OR REPLACE VIEW farmer_debt_summary AS
SELECT 
    f.id as farmer_id,
    f.name as farmer_name,
    f.village,
    f.phone,
    f.admin_id,
    COALESCE(SUM(p.total_amount), 0) as total_purchase_value,
    COALESCE(SUM(p.advance_deducted), 0) as total_advance_deducted,
    COALESCE(SUM(p.cash_paid), 0) as total_cash_paid_at_purchase,
    (
        SELECT COALESCE(SUM(amount), 0) 
        FROM farmer_payments fp 
        WHERE LOWER(fp.farmer_id::text) = LOWER(f.id::text)
    ) as total_subsequent_payments,
    (
        COALESCE(SUM(p.total_amount), 0) - 
        COALESCE(SUM(p.advance_deducted), 0) - 
        COALESCE(SUM(p.cash_paid), 0) - 
        (
            SELECT COALESCE(SUM(amount), 0) 
            FROM farmer_payments fp 
            WHERE LOWER(fp.farmer_id::text) = LOWER(f.id::text)
        )
    ) as remaining_debt
FROM farmers f
LEFT JOIN purchases p ON f.id::text = p.farmer_id::text
GROUP BY f.id, f.name, f.village, f.phone, f.admin_id;

-- 5. Grant Permissions
GRANT ALL ON farmer_payments TO authenticated;
GRANT SELECT ON farmer_debt_summary TO authenticated;
