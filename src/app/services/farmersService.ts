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

  async delete(id: string) {
    const { error } = await supabase
      .from('farmers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  }
};
