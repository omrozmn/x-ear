import { useQuery } from '@tanstack/react-query';
import { getPatients } from '@/api/generated/patients/patients';
import type { Patient } from '@/api/generated/api.schemas';

export function usePatients() {
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatients().patientsGetPatients(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const patients: Patient[] = response?.data?.data || [];

  return {
    patients,
    isLoading,
    error,
    refetch
  };
}