import { supabase } from '../lib/supabase';

export interface CompanyProfile {
  id?: string;
  admin_id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  updated_at?: string;
}

export const settingsService = {
  async getCompanyProfile(adminId: string | null): Promise<CompanyProfile | null> {
    let query = supabase
      .from('company_profiles')
      .select('*');

    // RLS handles visibility (Pyramid Hierarchy)
    // We allow fetching without a filter to find any profile you have access to (usually one)
    if (adminId && adminId !== 'SUPER_ADMIN') {
      // query = query.eq('admin_id', adminId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching company profile:', error);
      return null;
    }
    return data;
  },

  async updateCompanyProfile(adminId: string, profile: Partial<CompanyProfile>): Promise<CompanyProfile> {
    // Extract everything except admin_id and id to prevent accidental overwrites
    const { admin_id, id, ...updateData } = profile;
    
    const { data, error } = await supabase
      .from('company_profiles')
      .upsert({
        admin_id: adminId,
        ...updateData,
      }, { onConflict: 'admin_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }
    return data;
  }
};
