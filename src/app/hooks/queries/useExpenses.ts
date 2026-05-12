import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { expensesService } from '../../services/expensesService';

export function useExpenses(adminId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['expenses', adminId],
    queryFn: () => expensesService.getAll(adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['expenses', adminId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, queryClient]);

  return query;
}

