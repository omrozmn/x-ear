import {
  useListDashboardChartPatientDistribution,
} from '@/api/client/dashboard.client';
import type { BranchDistribution } from '@/api/generated/schemas';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ResponseEnvelopeListBranchDistribution } from '@/api/generated/schemas';

export function usePartyDistribution(
  options?: {
    query?: Omit<
      Partial<UseQueryOptions<ResponseEnvelopeListBranchDistribution, unknown, BranchDistribution[]>>,
      'queryKey' | 'queryFn' | 'select'
    >
  }
): UseQueryResult<BranchDistribution[], unknown> {
  return useListDashboardChartPatientDistribution<BranchDistribution[]>({
    query: {
      select: (response: ResponseEnvelopeListBranchDistribution) => response.data ?? [],
      ...(options?.query ?? {}),
    },
  });
}

export default usePartyDistribution;
