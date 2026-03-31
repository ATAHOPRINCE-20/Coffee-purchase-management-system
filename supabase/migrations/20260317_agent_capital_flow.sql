-- ─────────────────────────────────────────
-- AGENT CAPITAL FLOW MIGRATION
-- ─────────────────────────────────────────

-- 1. Create agent_capital_advances table
CREATE TABLE IF NOT EXISTS agent_capital_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    agent_id UUID NOT NULL REFERENCES auth.users(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Settled')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE agent_capital_advances ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Admins can see/manage advances they give.
DROP POLICY IF EXISTS "admins_manage_agent_advances" ON agent_capital_advances;
CREATE POLICY "admins_manage_agent_advances" ON agent_capital_advances
    FOR ALL USING (admin_id = auth.uid());

-- Agents can see advances they receive.
DROP POLICY IF EXISTS "agents_view_received_advances" ON agent_capital_advances;
CREATE POLICY "agents_view_received_advances" ON agent_capital_advances
    FOR SELECT USING (agent_id = auth.uid());

-- 4. Indices for performance
CREATE INDEX IF NOT EXISTS idx_agent_adv_admin ON agent_capital_advances(admin_id);
CREATE INDEX IF NOT EXISTS idx_agent_adv_agent ON agent_capital_advances(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_adv_status ON agent_capital_advances(status);
