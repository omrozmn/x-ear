import { useQuery } from '@tanstack/react-query';
import { apiClient } from './orval-mutator';

import { listDashboardChartPatientDistribution as listDashboardChartPartyDistribution } from '@/api/client/dashboard.client';

export async function fetchPartyDistribution() {
  const res = await listDashboardChartPartyDistribution() as any; // API returns data despite void type
  return res || [];
}

export function usePartyDistribution(options?: any) {
  // Accept either a raw options object or the generated wrapper shape { query: {...}, axios: ... }
  const { query, ...rest } = options ?? {};
  const queryOptions = {
    queryKey: ['dashboard', 'party-distribution'],
    queryFn: fetchPartyDistribution,
    ...(query ?? rest)
  };
  return useQuery(queryOptions as any);
}

export default usePartyDistribution;
