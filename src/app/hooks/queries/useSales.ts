import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function useSales(adminId: string | null, limit: number = 50) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sales', adminId, limit],
    queryFn: async () => {
      let q = supabase
        .from('sales')
        .select('*, admin:admin_id(full_name)')
        .order('date', { ascending: false })
        .limit(limit);
      
      if (adminId !== 'SUPER_ADMIN') {
        q = q.eq('admin_id', adminId);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channel = supabase
      .channel('sales-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sales', adminId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, queryClient]);

  return query;
}
