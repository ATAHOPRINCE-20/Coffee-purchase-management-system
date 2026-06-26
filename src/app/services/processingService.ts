import { supabase } from '../lib/supabase';
import { COFFEE_CONVERSION_RATES } from '../utils/coffeeConversions';

/**
 * A ProcessingBatch records the actual conversion of raw coffee into Kase.
 *
 * Two stages:
 *   - "Dry & Mill": Red Cherry → Kase  (standard: 25%)
 *   - "Mill":       Kiboko → Kase       (standard: 65%)
 *
 * When a batch is recorded, the actual output weight overrides the
 * auto-estimated yield for the stock calculation.
 */
export interface ProcessingBatch {
  id: string;
  admin_id: string;
  season_id?: string;

  stage: 'Dry & Mill' | 'Mill';
  input_coffee_type: 'Red' | 'Kiboko';
  input_weight: number;           // kg that went in

  output_weight: number;          // kg of Kase actually received
  estimated_output: number;       // kg Kase system would have estimated (computed)
  yield_percentage: number;       // actual output / input * 100

  processor_name?: string;        // e.g. "Mt. Elgon Millers"
  notes?: string;
  processing_date: string;        // ISO date string
  coffee_batch_id?: string;       // Linked weekly/monthly batch (NEW)
  coffee_batch?: {                // Joined coffee batch details
    name: string;
  };
  created_at?: string;
}

export type CreateProcessingBatch = Omit<ProcessingBatch, 'id' | 'created_at' | 'estimated_output' | 'yield_percentage' | 'coffee_batch'>;

/** Enrich a raw DB row with computed fields */
function enrich(row: any): ProcessingBatch {
  const rate = COFFEE_CONVERSION_RATES[row.input_coffee_type as string] ?? 1.0;
  const estimated_output = (row.input_weight || 0) * rate;
  const yield_percentage =
    row.input_weight > 0 ? (row.output_weight / row.input_weight) * 100 : 0;
  return { ...row, estimated_output, yield_percentage };
}

export const processingService = {
  async getAll(adminId: string, seasonId?: string): Promise<ProcessingBatch[]> {
    let query = supabase
      .from('coffee_processing')
      .select('*, coffee_batch:coffee_batch_id(name)')
      .order('processing_date', { ascending: false });

    if (adminId !== 'SUPER_ADMIN') {
      query = query.eq('admin_id', adminId);
    }
    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(enrich);
  },

  async create(batch: CreateProcessingBatch): Promise<ProcessingBatch> {
    const rate = COFFEE_CONVERSION_RATES[batch.input_coffee_type] ?? 1.0;
    const estimated_output = batch.input_weight * rate;

    const { data, error } = await supabase
      .from('coffee_processing')
      .insert({
        admin_id: batch.admin_id,
        season_id: batch.season_id,
        stage: batch.stage,
        input_coffee_type: batch.input_coffee_type,
        input_weight: batch.input_weight,
        output_weight: batch.output_weight,
        estimated_output,
        processor_name: batch.processor_name,
        notes: batch.notes,
        processing_date: batch.processing_date,
        coffee_batch_id: batch.coffee_batch_id,
      })
      .select()
      .single();

    if (error) throw error;

    // If a batch is linked, mark it as Milled
    if (batch.coffee_batch_id) {
      const { error: batchErr } = await supabase
        .from('coffee_batches')
        .update({ status: 'Milled' })
        .eq('id', batch.coffee_batch_id);
      if (batchErr) throw batchErr;
    }

    return enrich(data);
  },

  async delete(id: string): Promise<void> {
    // 1. Fetch the batch to see if it had a linked coffee_batch_id
    const { data: processingRow, error: fetchErr } = await supabase
      .from('coffee_processing')
      .select('coffee_batch_id')
      .eq('id', id)
      .single();
    
    if (fetchErr) throw fetchErr;

    // 2. Delete the processing row
    const { error: deleteErr } = await supabase
      .from('coffee_processing')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    // 3. If there was a linked batch, mark it back to Open
    if (processingRow && processingRow.coffee_batch_id) {
      const { error: batchErr } = await supabase
        .from('coffee_batches')
        .update({ status: 'Open' })
        .eq('id', processingRow.coffee_batch_id);
      if (batchErr) throw batchErr;
    }
  },

  /**
   * Get total ACTUAL Kase output from processing records since a given timestamp.
   * Also returns the total ESTIMATED output for those same records (so we can compare).
   *
   * Used by getAvailableStock() to override the auto-estimate for processed inputs.
   */
  async getProcessingCorrectionSince(
    adminId: string,
    sinceTime: string,
    seasonId?: string
  ): Promise<{ actualOutput: number; estimatedOutput: number }> {
    let query = supabase
      .from('coffee_processing')
      .select('input_coffee_type, input_weight, output_weight')
      .gt('created_at', sinceTime);

    if (adminId !== 'SUPER_ADMIN') {
      query = query.eq('admin_id', adminId);
    }
    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    const { data, error } = await query;
    if (error) throw error;

    let actualOutput = 0;
    let estimatedOutput = 0;

    for (const row of data || []) {
      const rate = COFFEE_CONVERSION_RATES[row.input_coffee_type as string] ?? 1.0;
      actualOutput += row.output_weight || 0;
      estimatedOutput += (row.input_weight || 0) * rate;
    }

    return { actualOutput, estimatedOutput };
  },

  async getUnprocessedTotals(
    adminId: string,
    seasonId?: string
  ): Promise<{
    purchasedRed: number;
    processedRed: number;
    purchasedKiboko: number;
    processedKiboko: number;
  }> {
    // Get ALL purchases for the season — no last-sale gating — so totals always reflect on the form
    let pQuery = supabase
      .from('purchases')
      .select('payable_weight, coffee_type, farmers!inner(deleted_at)')
      .is('farmers.deleted_at', null);

    if (adminId !== 'SUPER_ADMIN') {
      pQuery = pQuery.eq('admin_id', adminId);
    }
    if (seasonId) {
      pQuery = pQuery.eq('season_id', seasonId);
    }

    const { data: pData, error: pError } = await pQuery;
    if (pError) throw pError;

    // Get ALL processing batches recorded for the season
    let prQuery = supabase
      .from('coffee_processing')
      .select('input_coffee_type, input_weight');

    if (adminId !== 'SUPER_ADMIN') {
      prQuery = prQuery.eq('admin_id', adminId);
    }
    if (seasonId) {
      prQuery = prQuery.eq('season_id', seasonId);
    }

    const { data: prData, error: prError } = await prQuery;
    if (prError) throw prError;

    let purchasedRed = 0;
    let purchasedKiboko = 0;
    let processedRed = 0;
    let processedKiboko = 0;

    for (const p of pData || []) {
      if ((p as any).coffee_type === 'Red') {
        purchasedRed += p.payable_weight || 0;
      } else if ((p as any).coffee_type === 'Kiboko') {
        purchasedKiboko += p.payable_weight || 0;
      }
    }

    for (const pr of prData || []) {
      if (pr.input_coffee_type === 'Red') {
        processedRed += pr.input_weight || 0;
      } else if (pr.input_coffee_type === 'Kiboko') {
        processedKiboko += pr.input_weight || 0;
      }
    }

    return { purchasedRed, processedRed, purchasedKiboko, processedKiboko };
  },
};
