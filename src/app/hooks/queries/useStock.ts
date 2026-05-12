import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { salesService } from '../../services/salesService';

export function useStock(adminId: string | null, seasonId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['available-stock', adminId, seasonId],
    queryFn: () => salesService.getAvailableStock(adminId!, seasonId),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channels = [
      supabase.channel('stock-purchases-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => {
        queryClient.invalidateQueries({ queryKey: ['available-stock', adminId] });
      }).subscribe(),
      supabase.channel('stock-sales-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        queryClient.invalidateQueries({ queryKey: ['available-stock', adminId] });
      }).subscribe(),
      supabase.channel('stock-settlements-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'agent_settlements' }, () => {
        queryClient.invalidateQueries({ queryKey: ['available-stock', adminId] });
      }).subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [adminId, queryClient]);

  return query;
}
