import { supabase } from "../lib/supabase";

export interface NotificationLog {
  id: string;
  farmer_id: string;
  type: 'SMS' | 'WhatsApp' | 'Email';
  content: string;
  status: 'Sent' | 'Failed' | 'Pending';
  sent_at: string;
  farmer_name?: string;
}

export const notificationService = {
  /**
   * Triggers monthly balance notifications for all farmers with advances
   * This logic would typically run in a Supabase Edge Function scheduled by pg_cron
   */
  async triggerMonthlyBalanceNotifications() {
    console.log("Triggering monthly notifications for all farmers with balance...");
    
    // 1. Fetch farmers with balance > 0
    // 2. Format message: "Hello [Name], your current coffee advance balance is UGX [Amount]. Please clear at next delivery."
    // 3. Call SMS/WA/Email APIs
    
    return { success: true, count: 0 };
  },

  async getLogs(limit = 50): Promise<NotificationLog[]> {
    // Mock logs for demonstration
    return [
      {
        id: "1",
        farmer_id: "f1",
        farmer_name: "Yasin Mukasa",
        type: 'SMS',
        content: "Balance reminder: UGX 150,000",
        status: 'Sent',
        sent_at: new Date().toISOString()
      },
      {
        id: "2",
        farmer_id: "f2",
        farmer_name: "Moses Okello",
        type: 'WhatsApp',
        content: "Balance reminder: UGX 450,000",
        status: 'Sent',
        sent_at: new Date().toISOString()
      }
    ];
  }
};
