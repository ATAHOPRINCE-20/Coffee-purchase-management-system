import { supabase } from '../lib/supabase';

export interface Season {
  id: string;
  name: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  admin_id?: string;
}

export const seasonsService = {
  async getActive(adminId: string) {
    let query = supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true);

    // RLS handles visibility
    
    const { data, error } = await query.limit(1).maybeSingle();
    
    if (error) throw error;
    return data as Season | null;
  },

  async getAll(adminId: string) {
    let query = supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false });

    // RLS handles visibility
    
    const { data, error } = await query;
    if (error) throw error;
    return data as Season[];
  }
};
