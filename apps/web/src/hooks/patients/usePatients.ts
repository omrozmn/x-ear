import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGlobalError } from '../../components/GlobalErrorHandler';
import { patientApiService } from '../../services/patient/patient-api.service';
import { PATIENT_QUERY_KEYS, PATIENT_CONSTANTS } from '../../constants/patient';
import { 
  Patient as LegacyPatient, 
  PatientFilters as LegacyPatientFilters,
  PatientSearchResult,
  PatientStats
} from '../../types/patient';
import { 
  Patient as OrvalPatient,
  PatientStatus
} from "../../api/generated/api.schemas";
import { 
  convertOrvalToLegacyPatient,
  convertLegacyToOrvalPatient,
  createPatientRequestFromFormData
} from '../../utils/patient-adapter';

// Default filters for patient list
const defaultFilters: LegacyPatientFilters = {
  page: 1,
  limit: PATIENT_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE,
};

/**
 * Hook for fetching patients list with filters
 */
export const usePatients = (filters: Partial<LegacyPatientFilters> = {}) => {
  const finalFilters = { ...defaultFilters, ...filters };
  
  return useQuery({
    queryKey: PATIENT_QUERY_KEYS.list(finalFilters),
    queryFn: async () => {
      const response = await patientApiService.getPatients({
        page: finalFilters.page,
        per_page: finalFilters.limit,
        search: finalFilters.search,
        status: finalFilters.status as PatientStatus,
      });
      
      // Convert Orval patients to legacy format
      const legacyPatients = response.data?.data?.map(convertOrvalToLegacyPatient) || [];
      
      return {
        patients: legacyPatients,
        total: response.data?.meta?.total || 0,
        page: response.data?.meta?.page || 1,
        pageSize: response.data?.meta?.per_page || PATIENT_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE,
        hasMore: (response.data?.meta?.page || 1) < (response.data?.meta?.total_pages || 1),
      } as PatientSearchResult;
    },
    staleTime: PATIENT_CONSTANTS.CACHE.STALE_TIME,
    gcTime: PATIENT_CONSTANTS.CACHE.GC_TIME,
  });
};

/**
 * Hook for creating a new patient
 */
export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useGlobalError();
  
  return useMutation({
    mutationFn: async (patientData: Partial<LegacyPatient>) => {
      const orvalRequest = createPatientRequestFromFormData(patientData);
      const response = await patientApiService.createPatient(orvalRequest);
      return convertOrvalToLegacyPatient(response as OrvalPatient);
    },
    onSuccess: (newPatient) => {
      // Invalidate and refetch patients list
      queryClient.invalidateQueries({ queryKey: PATIENT_QUERY_KEYS.lists() });
      
      // Optimistically update cache if we have the patient ID
      if (newPatient?.id) {
        queryClient.setQueryData(
          PATIENT_QUERY_KEYS.detail(newPatient.id),
          newPatient
        );
      }
      
      showSuccess(PATIENT_CONSTANTS.SUCCESS_MESSAGES.PATIENT_CREATED);
    },
    onError: (error) => {
      console.error('Failed to create patient:', error);
      showError(error, { title: 'Hasta Oluşturma Hatası' });
    },
  });
};

/**
 * Hook for deleting a patient
 */
export const useDeletePatient = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useGlobalError();
  
  return useMutation({
    mutationFn: async (patientId: string) => {
      await patientApiService.deletePatient(patientId);
      return patientId;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: PATIENT_QUERY_KEYS.detail(deletedId) });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: PATIENT_QUERY_KEYS.lists() });
      
      showSuccess(PATIENT_CONSTANTS.SUCCESS_MESSAGES.PATIENT_DELETED);
    },
    onError: (error) => {
      console.error('Failed to delete patient:', error);
      showError(error, { title: 'Hasta Silme Hatası' });
    },
  });
};