import { supabase } from '../lib/supabase';

export interface BuyingPrice {
  id: string;
  date: string;
  kiboko_price: number;
  red_price: number;
  kase_price: number;
  notes: string | null;
  set_by: string | null;
  admin_id: string | null;
  set_at: string;
  profiles?: {
    full_name: string;
  };
}

export const pricesService = {
  async getLatest(adminId: string | null) {
    let query = supabase
      .from('buying_prices')
      .select('*')
      .order('date', { ascending: false })
      .limit(1);

    // If no adminId provided, we rely purely on RLS to find the latest accessible price
    if (adminId && adminId !== 'SUPER_ADMIN') {
      // Still allow filtering if explicitly requested, but usually RLS is enough
      // We'll comment this out or make it optional to allow agents to see their parent's prices
      // query = query.eq('admin_id', adminId);
    }

    const { data, error } = await query.maybeSingle();
    
    if (error) throw error;
    return data as BuyingPrice | null;
  },

  async getHistory(limit = 30, adminId: string | null) {
    let query = supabase
      .from('buying_prices')
      .select('*, profiles(full_name)')
      .order('date', { ascending: false })
      .limit(limit);

    // If no adminId provided, we rely purely on RLS to find accessible prices
    if (adminId && adminId === 'SUPER_ADMIN') {
      // Super admin sees all, others are filtered by RLS
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as BuyingPrice[];
  },

  async setPrices(prices: Omit<BuyingPrice, 'id' | 'set_at'>) {
    const { data, error } = await supabase
      .from('buying_prices')
      .upsert(prices, { onConflict: 'date,admin_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data as BuyingPrice;
  }
};
