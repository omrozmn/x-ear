import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

export const fetchPatientDistribution = async () => {
  const res = await axios.get('/api/dashboard/charts/patient-distribution');
  return res.data;
};

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
