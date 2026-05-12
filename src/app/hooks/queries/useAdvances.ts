import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { advancesService } from '../../services/advancesService';

export function useAdvances(adminId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['advances', adminId],
    queryFn: () => advancesService.getAll(adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    // Subscribe to all changes in the advances table
    const channel = supabase
      .channel('advances-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advances'
        },
        (payload) => {
          console.log('Advances update received:', payload);
          // Invalidate the cache to trigger a background re-fetch
          queryClient.invalidateQueries({ queryKey: ['advances', adminId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, queryClient]);

  return query;
}
