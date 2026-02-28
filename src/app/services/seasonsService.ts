import { supabase } from '../lib/supabase';

export interface Season {
  id: string;
  name: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

export const seasonsService = {
  async getActive() {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows'
    return data as Season | null;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data as Season[];
  }
};
