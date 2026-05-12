import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { agentAdvancesService } from '../../services/agentAdvancesService';

export function useAgentAdvances(adminId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['agent-advances', adminId],
    queryFn: () => agentAdvancesService.getAllForAdmin(adminId!),
    enabled: !!adminId,
  });

  useEffect(() => {
    if (!adminId) return;
    const channel = supabase.channel('agent-advances-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'agent_advances' }, () => {
      queryClient.invalidateQueries({ queryKey: ['agent-advances', adminId] });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [adminId, queryClient]);

  return query;
}

export function useAgentAdvancesForAgent(agentId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['agent-advances-for-agent', agentId],
    queryFn: () => agentAdvancesService.getAllForAgent(agentId!),
    enabled: !!agentId,
  });

  useEffect(() => {
    if (!agentId) return;
    const channel = supabase.channel(`agent-advances-${agentId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'agent_advances' }, () => {
      queryClient.invalidateQueries({ queryKey: ['agent-advances-for-agent', agentId] });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agentId, queryClient]);

  return query;
}
