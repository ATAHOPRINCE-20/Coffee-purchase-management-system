import { useQuery } from '@tanstack/react-query';
import { purchasesService } from '../../services/purchasesService';
import { getEATDateString } from '../../utils/dateUtils';

export function useDashboardStats(adminId: string | null, onlyPersonal: boolean, seasonId?: string) {
  return useQuery({
    queryKey: ['dashboard-stats', adminId, onlyPersonal, seasonId],
    queryFn: () => purchasesService.getDashboardStats(adminId!, getEATDateString(), onlyPersonal, seasonId),
    enabled: !!adminId,
  });
}
