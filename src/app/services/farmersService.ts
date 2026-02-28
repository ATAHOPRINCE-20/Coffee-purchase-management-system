import { supabase } from '../lib/supabase';

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  village: string;
  region: string;
  admin_id?: string;
  created_at?: string;
}

export const farmersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('farmers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as Farmer[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('farmers')
      .select('*')
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
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
