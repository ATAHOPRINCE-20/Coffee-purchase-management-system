import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { farmersService } from '../../services/farmersService';
import { purchasesService } from '../../services/purchasesService';
import { advancesService } from '../../services/advancesService';
import { farmerPaymentsService } from '../../services/farmerPaymentsService';

export function useFarmerById(id: string | undefined) {
  return useQuery({
    queryKey: ['farmer', id],
    queryFn: () => farmersService.getById(id!),
    enabled: !!id,
  });
}

export function usePurchasesByFarmerId(farmerId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['purchases', 'farmer', farmerId],
    queryFn: () => purchasesService.getByFarmerId(farmerId!),
    enabled: !!farmerId,
  });

  useEffect(() => {
    if (!farmerId) return;

    const channel = supabase
      .channel(`farmer-purchases-${farmerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases',
          filter: `farmer_id=eq.${farmerId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['purchases', 'farmer', farmerId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmerId, queryClient]);

  return query;
}

export function useAdvancesByFarmerId(farmerId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['advances', 'farmer', farmerId],
    queryFn: () => advancesService.getByFarmerId(farmerId!),
    enabled: !!farmerId,
  });

  useEffect(() => {
    if (!farmerId) return;

    const channel = supabase
      .channel(`farmer-advances-${farmerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advances',
          filter: `farmer_id=eq.${farmerId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['advances', 'farmer', farmerId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmerId, queryClient]);

  return query;
}

export function useDebtPaymentsByFarmerId(farmerId: string | undefined) {
  return useQuery({
    queryKey: ['debt-payments', farmerId],
    queryFn: () => farmerPaymentsService.getPaymentsByFarmer(farmerId!),
    enabled: !!farmerId,
  });
}
