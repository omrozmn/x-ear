import { useQuery } from '@tanstack/react-query';

import { listDashboardChartPatientDistribution as listDashboardChartPartyDistribution } from '@/api/client/dashboard.client';

import { UseQueryOptions } from '@tanstack/react-query';

// Type is unknown in generated client, so we assume an array of unknown objects
export async function fetchPartyDistribution(): Promise<unknown[]> {
  const res = await listDashboardChartPartyDistribution() as unknown as unknown[];
  return res || [];
}

export function usePartyDistribution(options?: { query?: UseQueryOptions<unknown[]> }) {
  // Accept either a raw options object or the generated wrapper shape { query: {...}, axios: ... }
  const { query } = options ?? {};
  const queryOptions = {
    queryKey: ['dashboard', 'party-distribution'],
    queryFn: fetchPartyDistribution,
    ...query
  };
  return useQuery(queryOptions);
}

export default usePartyDistribution;
