import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { farmerPaymentsService } from '../../services/farmerPaymentsService';

export function useDebtSummary(adminId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['debt-summary', adminId],
    queryFn: () => farmerPaymentsService.getDebtsSummary(adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channels = [
      supabase.channel('debt-purchases').on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['debt-summary', adminId] });
      }).subscribe(),
      supabase.channel('debt-payments').on('postgres_changes', { event: '*', schema: 'public', table: 'farmer_payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['debt-summary', adminId] });
      }).subscribe(),
      supabase.channel('debt-advances').on('postgres_changes', { event: '*', schema: 'public', table: 'advances' }, () => {
        queryClient.invalidateQueries({ queryKey: ['debt-summary', adminId] });
      }).subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [adminId, queryClient]);

  return query;
}
