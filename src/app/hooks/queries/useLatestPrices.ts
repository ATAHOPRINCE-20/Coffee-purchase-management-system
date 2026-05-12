import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { pricesService } from '../../services/pricesService';

export function useLatestPrices(adminId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['latest-prices', adminId],
    queryFn: () => pricesService.getLatest(adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channel = supabase
      .channel('prices-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buying_prices'
        },
        () => {
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
