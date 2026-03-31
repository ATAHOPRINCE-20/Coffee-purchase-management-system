import { supabase } from '../lib/supabase';
import { get } from 'idb-keyval';

export interface Purchase {
  id: string;
  farmer_id: string;
  season_id: string;
  date: string;
  coffee_type: 'Kiboko' | 'Red' | 'Kase';
  gross_weight: number;
  moisture_content: number;
  standard_moisture: number;
  deduction_weight: number;
  payable_weight: number;
  buying_price: number;
  total_amount: number;
  advance_deducted: number;
  cash_paid: number;
  field_agent_id: string;
  admin_id?: string;
  created_at?: string;
}

export const purchasesService = {
  async getAll(adminId: string, limit?: number, onlyDirect?: boolean) {
    let query = supabase
      .from('purchases')
      .select('*, farmers(name, phone, village), field_agent:field_agent_id(full_name), admin:admin_id(full_name)')
      .order('date', { ascending: false });
      
    if (onlyDirect) {
      query = query.eq('field_agent_id', adminId);
    }
    // Super Admins see everything, others see self + descendants.
    
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    
    let allData = data || [];
    try {
      const queue: any[] = await get('offline_sync_queue') || [];
      const offlinePurchases = queue
        .filter(q => q.type === 'CREATE_PURCHASE')
        .map(q => ({
           ...q.payload, 
           isOfflinePreview: true, 
           farmers: { name: 'Pending Sync...' } 
        }));
      
      // Filter by admin_id if payload has it
      const myOffline = offlinePurchases.filter(p => !p.admin_id || p.admin_id === adminId);
      
      allData = [...myOffline, ...allData].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.error('Failed to merge offline purchases', e);
    }
    
    return allData;
  },

  async getForAgent(agentId: string) {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, farmers(name)')
      .eq('field_agent_id', agentId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getByFarmerId(farmerId: string) {

    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('date', { ascending: false });
    
    if (error) throw error;

    let allData = data || [];
    try {
      const queue: any[] = await get('offline_sync_queue') || [];
      const offlinePurchases = queue
        .filter(q => q.type === 'CREATE_PURCHASE' && q.payload.farmer_id === farmerId)
        .map(q => ({ ...q.payload, isOfflinePreview: true }));
      
      allData = [...offlinePurchases, ...allData].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.error('Failed to merge offline purchases for farmer', e);
    }

    return allData as Purchase[];
  },

  async create(purchase: Omit<Purchase, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('purchases')
      .insert(purchase)
      .select()
      .single();
    
    if (error) throw error;
    return data as Purchase;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, farmers(name, phone, village), field_agent:field_agent_id(full_name), admin:admin_id(full_name)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Purchase & { farmers?: { name: string } };
  },

  async update(id: string, updates: Partial<Purchase>) {
    const { data, error } = await supabase
      .from('purchases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Purchase;
  },

  async getDashboardStats(adminId: string, date: string, onlyDirect?: boolean, seasonId?: string) {
    // We execute multiple parallel count/sum queries for speed
    let todayQuery = supabase
      .from('purchases')
      .select('payable_weight, total_amount, coffee_type')
      .eq('date', date);

    let monthlyQuery = supabase
      .from('purchases')
      .select('payable_weight, total_amount, coffee_type')
      .gte('date', date.substring(0, 7) + '-01');

    let seasonalQuery = null;
    if (seasonId) {
      seasonalQuery = supabase
        .from('purchases')
        .select('payable_weight, total_amount')
        .eq('season_id', seasonId);
    }

    if (onlyDirect) {
      todayQuery = todayQuery.eq('field_agent_id', adminId);
      monthlyQuery = monthlyQuery.eq('field_agent_id', adminId);
      if (seasonalQuery) {
        seasonalQuery = seasonalQuery.eq('field_agent_id', adminId);
      }
    }

    // RLS handles visibility

    const [
      { data: todayData, error: todayError },
      { data: monthlyData, error: monthlyError },
      seasonalResult
    ] = await Promise.all([
      todayQuery,
      monthlyQuery,
      seasonalQuery || Promise.resolve({ data: [], error: null })
    ]);

    if (todayError) throw todayError;
    if (monthlyError) throw monthlyError;
    if (seasonalResult.error) throw seasonalResult.error;

    const stats = {
      today: {
        count: todayData?.length || 0,
        weight: todayData?.reduce((s, p) => s + (p.payable_weight || 0), 0) || 0,
        value: todayData?.reduce((s, p) => s + (p.total_amount || 0), 0) || 0,
        types: {
          Kiboko: todayData?.filter(p => p.coffee_type === 'Kiboko').reduce((s, p) => s + (p.payable_weight || 0), 0) || 0,
          Red: todayData?.filter(p => p.coffee_type === 'Red').reduce((s, p) => s + (p.payable_weight || 0), 0) || 0,
          Kase: todayData?.filter(p => p.coffee_type === 'Kase').reduce((s, p) => s + (p.payable_weight || 0), 0) || 0,
        }
      },
      monthly: {
        weight: monthlyData?.reduce((s, p) => s + (p.payable_weight || 0), 0) || 0,
        value: monthlyData?.reduce((s, p) => s + (p.total_amount || 0), 0) || 0,
        types: {
          Kiboko: monthlyData?.filter(p => p.coffee_type === 'Kiboko').reduce((s, p) => s + (p.payable_weight || 0), 0) || 0,
          Red: monthlyData?.filter(p => p.coffee_type === 'Red').reduce((s, p) => s + (p.payable_weight || 0), 0) || 0,
          Kase: monthlyData?.filter(p => p.coffee_type === 'Kase').reduce((s, p) => s + (p.payable_weight || 0), 0) || 0,
        }
      },
      seasonal: {
        weight: seasonalResult.data?.reduce((s, p) => s + (p.payable_weight || 0), 0) || 0,
        value: seasonalResult.data?.reduce((s, p) => s + (p.total_amount || 0), 0) || 0,
      }
    };

    return stats;
  },

  async getTopFarmers(adminId: string, limit: number = 5) {
    // The easiest way to get top farmers by weight for a dashboard in Supabase without a custom RPC 
    // is to fetch the current season's purchases and aggregate in JS (since we likely have < 5000 purchases for immediate display).
    // For optimal scale, this should be an RPC.
    
    // RLS handles visibility
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();

    if (!activeSeason) return [];

    const { data, error } = await supabase
      .from('purchases')
      .select('farmer_id, payable_weight, farmers(name)')
      .eq('season_id', activeSeason.id);
    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Aggregate by farmer_id
    const aggregated: Record<string, { name: string, total_weight: number }> = {};
    
    // Using any for casting because Supabase joins types can be tricky
    (data as any[]).forEach(p => {
      const fid = p.farmer_id;
      if (!aggregated[fid]) {
        // the farmers join returns an object or array of objects depending on relation
        let farmerName = 'Unknown';
        if (p.farmers) {
          if (Array.isArray(p.farmers)) {
            farmerName = p.farmers[0]?.name || 'Unknown';
          } else {
            farmerName = p.farmers.name || 'Unknown';
          }
        }
        aggregated[fid] = { name: farmerName, total_weight: 0 };
      }
      aggregated[fid].total_weight += (p.payable_weight || 0);
    });

    // Sort and limit
    const sorted = Object.values(aggregated)
      .sort((a, b) => b.total_weight - a.total_weight)
      .slice(0, limit);

    return sorted;
  },

  async getAgentPerformanceStats(seasonId: string, date: string) {
    const { data, error } = await supabase
      .from('purchases')
      .select('field_agent_id, payable_weight, date, field_agent:field_agent_id(full_name)')
      .eq('season_id', seasonId);
      
    if (error) throw error;
    
    const performance: Record<string, { 
      name: string, 
      daily: number, 
      monthly: number, 
      seasonal: number 
    }> = {};
    
    const today = date;
    const thisMonth = date.substring(0, 7);
    
    (data as any[]).forEach(p => {
      const aid = p.field_agent_id;
      if (!aid) return;
      
      if (!performance[aid]) {
        performance[aid] = { 
          name: p.field_agent?.full_name || 'Unknown', 
          daily: 0, 
          monthly: 0, 
          seasonal: 0 
        };
      }
      
      const weight = p.payable_weight || 0;
      performance[aid].seasonal += weight;
      
      if (p.date === today) {
        performance[aid].daily += weight;
      }
      
      if (p.date.startsWith(thisMonth)) {
        performance[aid].monthly += weight;
      }
    });
    
    return Object.values(performance).sort((a, b) => b.seasonal - a.seasonal);
  }
};
