import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { purchasesService } from '../../services/purchasesService';

export function usePurchases(adminId: string | null, limit?: number, onlyPersonal = false) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['purchases', adminId, limit, onlyPersonal],
    queryFn: () => purchasesService.getAll(adminId!, limit, onlyPersonal),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channel = supabase
      .channel('purchases-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['purchases'] });
          // Also invalidate dashboard stats since they depend on purchases
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, queryClient]);

  return query;
}
