import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { farmerPaymentsService } from '../../services/farmerPaymentsService';

export function useFarmerDebts(adminId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['farmer-debts', adminId],
    queryFn: () => farmerPaymentsService.getDebtsSummary(adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channels = [
      supabase.channel('farmer-payments-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'farmer_payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['farmer-debts', adminId] });
      }).subscribe(),
      supabase.channel('purchases-realtime-debts').on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['farmer-debts', adminId] });
      }).subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [adminId, queryClient]);

  return query;
}

export function useFarmerPaymentHistory(farmerId: string | null) {
  return useQuery({
    queryKey: ['farmer-payment-history', farmerId],
    queryFn: () => farmerPaymentsService.getPaymentsByFarmer(farmerId!),
    enabled: !!farmerId,
  });
}
