import { useQuery } from '@tanstack/react-query';
import { apiClient } from './orval-mutator';

import { patientDistribution } from '@/api/generated';

export async function fetchPatientDistribution() {
  const res = await patientDistribution() as any; // API returns data despite void type
  return res || [];
}

export function usePatientDistribution(options?: any) {
  // Accept either a raw options object or the generated wrapper shape { query: {...}, axios: ... }
  const { query, ...rest } = options ?? {};
  const queryOptions = {
    queryKey: ['dashboard', 'patient-distribution'],
    queryFn: fetchPatientDistribution,
    ...(query ?? rest)
  };
  return useQuery(queryOptions as any);
}

export default usePatientDistribution;
