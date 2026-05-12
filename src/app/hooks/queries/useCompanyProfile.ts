import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { settingsService } from '../../services/settingsService';

export function useCompanyProfile(adminId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-profile', adminId],
    queryFn: () => settingsService.getCompanyProfile(adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;

    const channel = supabase
      .channel('company-profile-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_profiles'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['company-profile', adminId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, queryClient]);

  return query;
}
