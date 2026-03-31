import { supabase } from '../lib/supabase';

export interface AgentAdvance {
  id: string;
  admin_id: string;
  agent_id: string;
  amount: number;
  remaining_amount: number;
  status: 'Active' | 'Settled';
  issue_date: string;
  notes: string;
  created_at: string;
  agent?: {
    full_name: string;
  };
  issuer?: {
    full_name: string;
  };
}

export const agentAdvancesService = {
  async getAllForAdmin(adminId: string) {
    const { data, error } = await supabase
      .from('agent_capital_advances')
      .select('*, agent:agent_id(full_name)')
      .eq('admin_id', adminId)
      .order('issue_date', { ascending: false });

    if (error) throw error;
    return data as AgentAdvance[];
  },

  async getAllForAgent(agentId: string) {
    const { data, error } = await supabase
      .from('agent_capital_advances')
      .select('*, issuer:admin_id(full_name)')
      .eq('agent_id', agentId)
      .order('issue_date', { ascending: false });

    if (error) throw error;
    return data as AgentAdvance[];
  },

  async create(advance: Omit<AgentAdvance, 'id' | 'status' | 'created_at'>) {
    const { data, error } = await supabase
      .from('agent_capital_advances')
      .insert({
        ...advance,
        status: 'Active'
      })
      .select()
      .single();

    if (error) throw error;
    return data as AgentAdvance;
  },

  async settle(id: string) {
    const { data, error } = await supabase
      .from('agent_capital_advances')
      .update({ status: 'Settled', remaining_amount: 0 })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AgentAdvance;
  },

  async recordSettlement(params: {
    agent_id: string;
    admin_id: string;
    amount: number;
    weight?: number;
    unit_price?: number;
    coffee_type?: string;
    notes?: string;
  }) {
    const { data, error } = await supabase.rpc('record_agent_settlement_v1', {
      p_admin_id: params.admin_id,
      p_agent_id: params.agent_id,
      p_amount: params.amount,
      p_weight: params.weight || 0,
      p_unit_price: (params as any).unit_price || 0,
      p_coffee_type: params.coffee_type || null,
      p_notes: params.notes || null
    });

    if (error) throw error;
    return data;
  },

  async getSettlementsForAgent(agentId: string) {
    const { data, error } = await supabase
      .from('agent_settlements')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getSettlementsForAdmin(adminId: string) {
    const { data, error } = await supabase
      .from('agent_settlements')
      .select('*, agent:agent_id(full_name)')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
