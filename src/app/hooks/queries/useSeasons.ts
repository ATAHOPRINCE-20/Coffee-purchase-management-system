import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { seasonsService } from '../../services/seasonsService';

export function useSeasons(adminId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['seasons', adminId],
    queryFn: () => seasonsService.getAll(adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channel = supabase
      .channel('seasons-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seasons'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['seasons', adminId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, queryClient]);

  return query;
}
