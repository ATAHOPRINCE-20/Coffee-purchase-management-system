import { supabase } from '../lib/supabase';

export type ExpenseCategory = 'cost' | 'general';

export const COST_TYPES = ['Milling Charge', 'Transport', 'Labour'] as const;
export const GENERAL_TYPES = ['Salary', 'Meals', 'Accommodation', 'Transport', 'Airtime'] as const;

export type CostType = typeof COST_TYPES[number];
export type GeneralType = typeof GENERAL_TYPES[number];

export interface Expense {
  id: string;
  admin_id: string;
  season_id?: string;
  category: ExpenseCategory;
  type: string;
  amount: number;
  date: string;
  notes?: string;
  sale_id?: string;
  created_at?: string;
}

export const expensesService = {
  async getAll(adminId: string): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select('*, admin:admin_id(full_name)')
      .order('date', { ascending: false });

    // RLS handles visibility

    const { data, error } = await query;
    if (error) throw error;
    return data as Expense[];
  },

  async create(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expense)
      .select()
      .single();

    if (error) throw error;
    return data as Expense;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
