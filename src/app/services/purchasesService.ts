import { supabase } from '../lib/supabase';

export interface Purchase {
  id: string;
  farmer_id: string;
  season_id: string;
  date: string;
  coffee_type: 'Robusta' | 'Arabica' | 'Red' | 'Kase';
  gross_weight: number;
  moisture_content: number;
  standard_moisture: number;
  deduction_weight: number;
  payable_weight: number;
  buying_price: number;
  total_amount: number;
  advance_deducted: number;
  cash_paid: number;
  field_agent_id: string;
}

export const purchasesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, farmers(name)')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByFarmerId(farmerId: string) {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data as Purchase[];
  },

  async create(purchase: Omit<Purchase, 'id' | 'created_at'>) {
    // Generate custom ID or let Supabase do it. 
    // The schema says TEXT PRIMARY KEY for purchases, so we might need a custom ID generator like PUR001
    // For now, let's assume we pass it or use a random one if needed.
    const { data, error } = await supabase
      .from('purchases')
      .insert(purchase)
      .select()
      .single();
    
    if (error) throw error;
    return data as Purchase;
  }
};
