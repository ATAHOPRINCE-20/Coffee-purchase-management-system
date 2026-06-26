-- Create coffee_batches table
CREATE TABLE IF NOT EXISTS public.coffee_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    season_id TEXT REFERENCES public.seasons(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    batch_type VARCHAR(20) NOT NULL CHECK (batch_type IN ('weekly', 'monthly', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Milled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add batch_id to purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.coffee_batches(id) ON DELETE SET NULL;

-- Add coffee_batch_id to coffee_processing
ALTER TABLE public.coffee_processing ADD COLUMN IF NOT EXISTS coffee_batch_id UUID REFERENCES public.coffee_batches(id) ON DELETE SET NULL;

-- Enable RLS on coffee_batches
ALTER TABLE public.coffee_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for coffee_batches
DROP POLICY IF EXISTS "batches_tenant" ON public.coffee_batches;
CREATE POLICY "batches_tenant" ON public.coffee_batches
    USING (admin_id = get_my_admin_id())
    WITH CHECK (admin_id = get_my_admin_id());
