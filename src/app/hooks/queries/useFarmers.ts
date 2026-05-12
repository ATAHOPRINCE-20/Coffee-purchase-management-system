import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { farmersService } from '../../services/farmersService';

export function useFarmers(adminId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['farmers', adminId],
    queryFn: () => farmersService.getAll(adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channel = supabase
      .channel('farmers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farmers'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['farmers', adminId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, queryClient]);

  return query;
}
