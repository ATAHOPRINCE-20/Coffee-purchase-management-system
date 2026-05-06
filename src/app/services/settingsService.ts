import { supabase } from '../lib/supabase';

export interface CompanyProfile {
  id?: string;
  admin_id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  updated_at?: string;
  capital?: number;
}

export interface CapitalLedgerEntry {
  id: string;
  admin_id: string;
  amount: number;
  type: 'Top-up' | 'Purchase' | 'Advance' | 'Expense' | 'Adjustment';
  reference_id?: string;
  notes?: string;
  created_at: string;
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
    // Extract everything except admin_id, id, and capital to prevent accidental overwrites
    // Capital is managed exclusively via the capital_ledger triggers.
    const { admin_id, id, capital, ...updateData } = profile;
    
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
  },

  async getCapitalLedger(adminId: string, limit: number = 50, offset: number = 0): Promise<CapitalLedgerEntry[]> {
    const { data, error } = await supabase
      .from('capital_ledger')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data || [];
  },

  async addCapital(adminId: string, amount: number, notes: string): Promise<void> {
    const { error } = await supabase
      .from('capital_ledger')
      .insert({
        admin_id: adminId,
        amount,
        type: 'Top-up',
        notes
      });

    if (error) throw error;
  }
};
