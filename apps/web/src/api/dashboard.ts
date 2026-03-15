import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { BranchDistribution } from '@/api/generated/schemas';

interface PartyDistributionOptions {
  branchId?: string;
  query?: Omit<
    Partial<UseQueryOptions<BranchDistribution[], unknown, BranchDistribution[]>>,
    'queryKey' | 'queryFn'
  >;
}

async function fetchPartyDistribution(branchId?: string): Promise<BranchDistribution[]> {
  const search = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
  const response = await apiClient.request<BranchDistribution[]>(
    `/api/dashboard/charts/patient-distribution${search}`
  );

  return Array.isArray(response.data) ? response.data : [];
}

export function usePartyDistribution(
  options?: PartyDistributionOptions
): UseQueryResult<BranchDistribution[], unknown> {
  const { branchId, query } = options ?? {};

  return useQuery({
    queryKey: ['dashboard', 'party-distribution', branchId ?? 'all'],
    queryFn: () => fetchPartyDistribution(branchId),
    ...(query ?? {}),
  });
}

export default usePartyDistribution;
