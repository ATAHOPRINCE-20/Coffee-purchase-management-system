import { supabase } from '../lib/supabase';

export interface Sale {
  id: string;
  admin_id: string;
  season_id?: string;
  date: string;
  coffee_type: 'Kiboko' | 'Red' | 'Kase';
  gross_weight: number;
  moisture_content: number;
  standard_moisture: number;
  deduction_weight: number;
  net_weight: number;
  selling_price: number;
  total_amount: number;
  buyer_name?: string;
  notes?: string;
  created_at?: string;
}

export const salesService = {
  async getAll(adminId: string): Promise<Sale[]> {
    let query = supabase
      .from('sales')
      .select('*, admin:admin_id(full_name)')
      .order('date', { ascending: false });

    if (adminId !== 'SUPER_ADMIN') {
      query = query.eq('admin_id', adminId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Sale[];
  },

  async create(sale: Omit<Sale, 'id' | 'created_at'>): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .insert(sale)
      .select()
      .single();

    if (error) throw error;
    return data as Sale;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getLatestSaleBefore(adminId: string, coffeeType: string, beforeDate: string): Promise<Sale | null> {
    let query = supabase
      .from('sales')
      .select('*')
      .eq('coffee_type', coffeeType)
      .lt('created_at', beforeDate)
      .order('created_at', { ascending: false })
      .limit(1);

    if (adminId !== 'SUPER_ADMIN') {
      query = query.eq('admin_id', adminId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data as Sale | null;
  },

  async getAvailableStock(adminId: string, seasonId?: string): Promise<number> {
    // 0. Get the latest sale timestamp for this admin/season
    let latestSaleQuery = supabase
      .from('sales')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (adminId !== 'SUPER_ADMIN') {
      latestSaleQuery = latestSaleQuery.eq('admin_id', adminId);
    }
    if (seasonId) {
      latestSaleQuery = latestSaleQuery.eq('season_id', seasonId);
    }

    const { data: latestSale } = await latestSaleQuery.maybeSingle();
    const lastSaleTime = latestSale?.created_at || '1970-01-01T00:00:00Z';

    // 1. Get total purchases weight since the last sale
    let pQuery = supabase
      .from('purchases')
      .select('payable_weight')
      .gt('created_at', lastSaleTime);
    
    if (adminId !== 'SUPER_ADMIN') {
      pQuery = pQuery.eq('admin_id', adminId);
    }
    if (seasonId) {
      pQuery = pQuery.eq('season_id', seasonId);
    }
    
    const { data: pData, error: pError } = await pQuery;
    if (pError) throw pError;
    const totalPurchases = pData?.reduce((sum, p) => sum + (p.payable_weight || 0), 0) || 0;

    // 2. Get total agent settlements weight since the last sale
    let sQuery = supabase
      .from('agent_settlements')
      .select('weight')
      .gt('created_at', lastSaleTime);
    
    if (adminId !== 'SUPER_ADMIN') {
      sQuery = sQuery.eq('admin_id', adminId);
    }
    const { data: sData, error: sError } = await sQuery;
    if (sError) throw sError;
    const totalSettlements = sData?.reduce((sum, s) => sum + (s.weight || 0), 0) || 0;

    // No need to subtract sales anymore because we are only looking at what was added AFTER the last sale.
    // This strictly enforces the "per batch" requirement.
    return totalPurchases + totalSettlements;
  },
};
