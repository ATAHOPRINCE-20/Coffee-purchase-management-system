import { supabase } from '../lib/supabase';
import { COFFEE_CONVERSION_RATES } from '../utils/coffeeConversions';
import { processingService } from './processingService';

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

    // 1. Get all purchases since the last sale, including coffee_type for conversion
    let pQuery = supabase
      .from('purchases')
      .select('payable_weight, coffee_type, farmers!inner(deleted_at)')
      .is('farmers.deleted_at', null)
      .gt('created_at', lastSaleTime);
    
    if (adminId !== 'SUPER_ADMIN') {
      pQuery = pQuery.eq('admin_id', adminId);
    }
    if (seasonId) {
      pQuery = pQuery.eq('season_id', seasonId);
    }
    
    const { data: pData, error: pError } = await pQuery;
    if (pError) throw pError;

    // Apply conversion ratios: Red×25%, Kiboko×65%, Kase×100%
    // This gives the total estimated Kase-equivalent weight available to sell.
    const autoEstimate = (pData || []).reduce((sum, p) => {
      const rate = COFFEE_CONVERSION_RATES[(p as any).coffee_type] ?? 1.0;
      return sum + (p.payable_weight || 0) * rate;
    }, 0);

    // 2. Get actual processing corrections (hybrid override)
    // When an admin records an actual batch (e.g. "milled 200 kg Kiboko → got 120 kg Kase"
    // instead of the estimated 130 kg), we apply the difference as a correction.
    // correction = actualOutput - estimatedOutput  (can be positive or negative)
    const { actualOutput, estimatedOutput } =
      await processingService.getProcessingCorrectionSince(adminId, lastSaleTime, seasonId);
    const processingCorrection = actualOutput - estimatedOutput;

    // 3. Get total agent settlements weight since the last sale
    // Agent settlements represent Kase weight already received at the warehouse.
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

    // Hybrid total:
    //   autoEstimate         = Kase from all purchases using standard ratios
    //   processingCorrection = delta from actual batches (actual - estimated for processed inputs)
    //   totalSettlements     = physical Kase received from agents
    return Math.max(0, autoEstimate + processingCorrection + totalSettlements);
  },
};
