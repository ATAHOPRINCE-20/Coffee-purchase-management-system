import { supabase } from '../lib/supabase';

export interface Advance {
  id: string;
  farmer_id: string;
  season_id: string;
  amount: number;
  deducted: number;
  remaining: number;
  status: 'Active' | 'Cleared';
  issue_date: string;
  notes: string;
  admin_id?: string;
}

export const advancesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('advances')
      .select('*, farmers(name)');
    
    if (error) throw error;
    return data;
  },

  async getByFarmerId(farmerId: string) {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('issue_date', { ascending: false });
    
    if (error) throw error;
    return data as Advance[];
  },

  async create(advance: Omit<Advance, 'remaining' | 'status' | 'created_at'>) {
    const { data, error } = await supabase
      .from('advances')
      .insert(advance)
      .select()
      .single();
    
    if (error) throw error;
    return data as Advance;
  },

  async update(id: string, updates: Omit<Partial<Advance>, 'remaining' | 'status'>) {
    const { data, error } = await supabase
      .from('advances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Advance;
  }
};
