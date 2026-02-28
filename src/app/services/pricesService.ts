import { supabase } from '../lib/supabase';

export interface BuyingPrice {
  id: string;
  date: string;
  robusta_price: number;
  arabica_price: number;
  red_price: number;
  kase_price: number;
  notes: string | null;
  set_by: string | null;
  set_at: string;
  profiles?: {
    full_name: string;
  };
}

export const pricesService = {
  async getLatest() {
    const { data, error } = await supabase
      .from('buying_prices')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as BuyingPrice | null;
  },

  async getHistory(limit = 30) {
    const { data, error } = await supabase
      .from('buying_prices')
      .select('*, profiles(full_name)')
      .order('date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as BuyingPrice[];
  },

  async setPrices(prices: Omit<BuyingPrice, 'id' | 'set_at'>) {
    const { data, error } = await supabase
      .from('buying_prices')
      .insert(prices)
      .select()
      .single();
    
    if (error) throw error;
    return data as BuyingPrice;
  }
};
