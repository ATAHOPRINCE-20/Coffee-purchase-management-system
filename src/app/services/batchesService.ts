import { supabase } from '../lib/supabase';

export interface CoffeeBatch {
  id: string;
  admin_id: string;
  season_id?: string;
  name: string;
  batch_type: 'weekly' | 'monthly' | 'custom';
  start_date: string;
  end_date: string;
  status: 'Open' | 'Milled';
  created_at?: string;
  total_weight?: number; // Computed in enrich
}

export type CreateCoffeeBatch = Omit<CoffeeBatch, 'id' | 'status' | 'created_at'>;

export interface PurchaseWithFarmer {
  id: string;
  date: string;
  payable_weight: number;
  total_amount: number;
  farmers: {
    name: string;
  };
}

export interface BatchDetails extends CoffeeBatch {
  purchases: PurchaseWithFarmer[];
}

function enrichBatch(row: any): CoffeeBatch {
  const purchases = row.purchases || [];
  const total_weight = purchases.reduce((sum: number, p: any) => sum + (p.payable_weight || 0), 0);
  return {
    ...row,
    total_weight,
  };
}

export const batchesService = {
  async getAll(adminId: string, seasonId?: string): Promise<CoffeeBatch[]> {
    let query = supabase
      .from('coffee_batches')
      .select('*, purchases(payable_weight)')
      .order('created_at', { ascending: false });

    if (adminId !== 'SUPER_ADMIN') {
      query = query.eq('admin_id', adminId);
    }
    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(enrichBatch);
  },

  async getBatchDetails(id: string): Promise<BatchDetails> {
    const { data, error } = await supabase
      .from('coffee_batches')
      .select(`
        *,
        purchases (
          id,
          date,
          payable_weight,
          total_amount,
          farmers (
            name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const total_weight = (data.purchases || []).reduce(
      (sum: number, p: any) => sum + (p.payable_weight || 0),
      0
    );

    return {
      ...data,
      total_weight,
    } as BatchDetails;
  },

  async create(batch: CreateCoffeeBatch): Promise<CoffeeBatch> {
    // 1. Insert the batch
    const { data: batchData, error: batchError } = await supabase
      .from('coffee_batches')
      .insert({
        admin_id: batch.admin_id,
        season_id: batch.season_id,
        name: batch.name,
        batch_type: batch.batch_type,
        start_date: batch.start_date,
        end_date: batch.end_date,
        status: 'Open',
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // 2. Auto-associate all matching Red Cherry purchases that don't already have a batch
    const { error: updateError } = await supabase
      .from('purchases')
      .update({ batch_id: batchData.id })
      .eq('coffee_type', 'Red')
      .eq('admin_id', batch.admin_id)
      .eq('season_id', batch.season_id)
      .is('batch_id', null)
      .gte('date', batch.start_date)
      .lte('date', batch.end_date);

    if (updateError) throw updateError;

    return enrichBatch({ ...batchData, purchases: [] });
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('coffee_batches')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getUnprocessedRedPurchasesWeight(
    adminId: string,
    seasonId?: string
  ): Promise<number> {
    let query = supabase
      .from('purchases')
      .select('payable_weight')
      .eq('coffee_type', 'Red')
      .is('batch_id', null);

    if (adminId !== 'SUPER_ADMIN') {
      query = query.eq('admin_id', adminId);
    }
    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).reduce((sum, p) => sum + (p.payable_weight || 0), 0);
  },
};
