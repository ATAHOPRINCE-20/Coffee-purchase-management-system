-- Add indexes to speed up multi-tenant lookups and historical filtering
-- Run this in the Supabase SQL Editor

-- Farmers
CREATE INDEX IF NOT EXISTS idx_farmers_admin_id ON farmers(admin_id);

-- Purchases
CREATE INDEX IF NOT EXISTS idx_purchases_admin_id ON purchases(admin_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_farmer_id ON purchases(farmer_id);

-- Advances
CREATE INDEX IF NOT EXISTS idx_advances_admin_id ON advances(admin_id);
CREATE INDEX IF NOT EXISTS idx_advances_farmer_id ON advances(farmer_id);

-- Buying Prices
CREATE INDEX IF NOT EXISTS idx_buying_prices_admin_id ON buying_prices(admin_id);
CREATE INDEX IF NOT EXISTS idx_buying_prices_date ON buying_prices(date DESC);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_admin_id ON expenses(admin_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);

-- Sales
CREATE INDEX IF NOT EXISTS idx_sales_admin_id ON sales(admin_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date DESC);
