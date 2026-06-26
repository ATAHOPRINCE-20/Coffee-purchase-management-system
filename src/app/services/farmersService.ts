import { supabase } from '../lib/supabase';

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  village: string;
  region: string;
  eudr_number?: string;
  admin_id?: string;
  created_at?: string;
  deleted_at?: string | null;
}

export const farmersService = {
  async getAll(adminId: string) {
    let query = supabase
      .from('farmers')
      .select('*, profiles:admin_id(full_name)')
      .is('deleted_at', null)
      .order('name');
      
    // RLS handles visibility

    const { data, error } = await query;
    if (error) throw error;
    return data as Farmer[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('farmers')
      .select('*, profiles:admin_id(full_name)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (error) throw error;
    return data as Farmer;
  },

  async create(farmer: Omit<Farmer, 'id' | 'created_at'> & { admin_id: string }) {
    const { data, error } = await supabase
      .from('farmers')
      .insert(farmer)
      .select()
      .single();
    
    if (error) throw error;
    return data as Farmer;
  },

  async update(id: string, updates: Partial<Farmer>) {
    const { data, error } = await supabase
      .from('farmers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Farmer;
  },

  async delete(id: string, cascadeHistory: boolean = false) {
    if (cascadeHistory) {
      // 1. Delete farmer payments
      const { error: payErr } = await supabase
        .from('farmer_payments')
        .delete()
        .eq('farmer_id', id);
      if (payErr) throw payErr;

      // 2. Delete purchases
      const { error: purchErr } = await supabase
        .from('purchases')
        .delete()
        .eq('farmer_id', id);
      if (purchErr) throw purchErr;

      // 3. Delete advances
      const { error: advErr } = await supabase
        .from('advances')
        .delete()
        .eq('farmer_id', id);
      if (advErr) throw advErr;

      // 4. Hard delete farmer record
      const { error: fErr } = await supabase
        .from('farmers')
        .delete()
        .eq('id', id);
      if (fErr) throw fErr;
    } else {
      const { error } = await supabase
        .from('farmers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    }
  }
};
