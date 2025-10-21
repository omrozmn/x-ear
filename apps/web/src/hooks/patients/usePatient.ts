// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import { patientApiService } from '@/services/patient/patient-api.service'
import { Patient } from '@/types/patient'

export const usePatient = (patientId?: string) => {
  const query = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) {
        throw new Error('Patient ID is required')
      }
      
      // Use our cached patient API service instead of direct API calls
      const patient = await patientApiService.fetchPatient(patientId)
      
      if (!patient) {
        throw new Error('Patient not found')
      }
      
      return patient
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    patient: query.data,
    loading: query.isLoading,
    error: query.error,
    isOnline: navigator.onLine,
    refresh: query.refetch,
    isSuccess: query.isSuccess,
    isError: query.isError
  }
}