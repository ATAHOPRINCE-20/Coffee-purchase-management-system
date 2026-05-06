import { supabase } from '../lib/supabase';

export interface FarmerPayment {
  id: string;
  farmer_id: string;
  purchase_id?: string;
  amount: number;
  payment_date: string;
  notes?: string;
  admin_id: string;
  created_at?: string;
}

export interface FarmerDebtSummary {
  farmer_id: string;
  farmer_name: string;
  village: string;
  phone: string;
  total_purchase_value: number;
  total_advance_deducted: number;
  total_cash_paid_at_purchase: number;
  total_subsequent_payments: number;
  remaining_debt: number;
}

export const farmerPaymentsService = {
  async getAllForAdmin(adminId: string) {
    const { data, error } = await supabase
      .from('farmer_payments')
      .select('*, farmers(name)')
      .eq('admin_id', adminId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getDebtsSummary(adminId: string) {
    let query = supabase
      .from('farmer_debt_summary')
      .select('*');
    
    if (adminId !== 'SUPER_ADMIN') {
      query = query.eq('admin_id', adminId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as FarmerDebtSummary[];
  },

  async getPaymentsByFarmer(farmerId: string) {
    const { data, error } = await supabase
      .from('farmer_payments')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data as FarmerPayment[];
  },

  async recordPayment(payment: Omit<FarmerPayment, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('farmer_payments')
      .insert(payment)
      .select()
      .single();

    if (error) throw error;
    return data as FarmerPayment;
  }
};
