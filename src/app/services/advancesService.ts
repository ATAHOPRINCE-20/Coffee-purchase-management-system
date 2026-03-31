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
  unit_price?: number;
  admin_id?: string;
}

export const advancesService = {
  async getAll(adminId: string) {
    let query = supabase
      .from('advances')
      .select('*, farmers(name), seasons(name), admin:admin_id(full_name)');
      
    // RLS handles visibility
    
    const { data, error } = await query;
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

  async update(id: string, updates: Omit<Partial<Advance>, 'remaining'>) {
    const { data, error } = await supabase
      .from('advances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Advance;
  },

  async getDashboardStats(adminId: string, options: { onlyDirect?: boolean } = {}) {
    let query = supabase
      .from('advances')
      .select('*, farmers(name), seasons(name)');

    if (options.onlyDirect) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query = query.eq('creator_id', user.id);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
