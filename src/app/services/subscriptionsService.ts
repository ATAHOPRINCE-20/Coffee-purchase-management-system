import { supabase } from '../lib/supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  features: {
    max_farmers: number;
    analytics: boolean;
    multi_agent?: boolean;
  };
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plans?: SubscriptionPlan;
}

export const subscriptionsService = {
  async getPlans() {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    
    if (error) throw error;
    return data as SubscriptionPlan[];
  },

  async getUserSubscription(userId: string) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*, plans:subscription_plans(*)')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data as UserSubscription | null;
  },

  async subscribe(userId: string, planId: string) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data as UserSubscription;
  }
};
