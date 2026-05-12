import { useQuery } from '@tanstack/react-query';
import { purchasesService } from '../../services/purchasesService';
import { getEATDateString } from '../../utils/dateUtils';

export function useAgentPerformance(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['agent-performance', seasonId],
    queryFn: () => purchasesService.getAgentPerformanceStats(seasonId!, getEATDateString()),
    enabled: !!seasonId,
  });
}
