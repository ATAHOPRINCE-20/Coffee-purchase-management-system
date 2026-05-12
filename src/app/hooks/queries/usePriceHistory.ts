import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { pricesService } from '../../services/pricesService';

export function usePriceHistory(adminId: string | null, limit: number = 30) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['price-history', adminId, limit],
    queryFn: () => pricesService.getHistory(limit, adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channel = supabase
      .channel('price-history-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buying_prices'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['price-history', adminId] });
          queryClient.invalidateQueries({ queryKey: ['latest-prices', adminId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, queryClient]);

  return query;
}
