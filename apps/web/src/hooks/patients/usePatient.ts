// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import { getPatients } from '@/api/generated/patients/patients'
import { Patient } from '@/types/patient'

export const usePatient = (patientId?: string) => {
  const query = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) {
        throw new Error('Patient ID is required')
      }
      
      // Since we don't have a specific getPatient endpoint, 
      // we'll fetch all patients and filter by ID
      const response = await getPatients().patientsGetPatients()
      const patient = response.data?.find((p: Patient) => p.id === patientId)
      
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