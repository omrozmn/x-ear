import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApiService } from '../../services/patient/patient-api.service';
import { convertOrvalToLegacyPatient, createPatientRequest } from '../../types/patient/patient-adapter';
import { PATIENT_CONSTANTS, PATIENT_QUERY_KEYS } from '../../constants/patient/constants';
import type { Patient } from '../../types/patient/patient.types';
import type { PatientsCreatePatientBody, PatientsGetPatients200 } from '../../generated/orval-api';
import type { Patient as OrvalPatient, PatientStatus } from '../../generated/orval-types';

// Simple filters interface for the hook
interface SimplePatientFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}

// Offline-first hook for patients list
export function usePatients(filters: Partial<SimplePatientFilters> = {}) {
  const defaultFilters: SimplePatientFilters = {
    page: 1,
    per_page: PATIENT_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE,
    ...filters
  };

  return useQuery({
    queryKey: PATIENT_QUERY_KEYS.list(defaultFilters),
    queryFn: async () => {
      const response = await patientApiService.fetchAllPatients();
      const data = response as any; // fetchAllPatients returns Patient[] directly
      
      // Convert Orval patients to legacy format
      const patients = (data.data || []).map(convertOrvalToLegacyPatient);
      
      return {
        patients,
        total: data.pagination?.total || 0,
        page: data.pagination?.page || 1,
        pageSize: data.pagination?.perPage || PATIENT_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE,
        hasMore: (data.pagination?.page || 1) < (data.pagination?.totalPages || 1)
      };
    },
    staleTime: PATIENT_CONSTANTS.CACHE.STALE_TIME,
    gcTime: PATIENT_CONSTANTS.CACHE.GC_TIME,
  });
}

// Hook for creating a new patient
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientData: {
      firstName: string;
      lastName: string;
      phone: string;
      tcNumber?: string;
      email?: string;
      birthDate?: string;
      address?: string;
      status?: PatientStatus;
    }) => {
      const orvalPatient = createPatientRequest(patientData) as Partial<PatientsCreatePatientBody>;

      // Ensure required fields for the API (provide sensible defaults for missing values)
      const request: PatientsCreatePatientBody = {
        status: (orvalPatient.status as 'active' | 'inactive') ?? 'active',
        firstName: orvalPatient.firstName ?? patientData.firstName,
        lastName: orvalPatient.lastName ?? patientData.lastName,
        priorityScore: orvalPatient.priorityScore ?? 0,
        tcNumber: orvalPatient.tcNumber ?? patientData.tcNumber ?? '',
        phone: orvalPatient.phone ?? patientData.phone,
        tags: orvalPatient.tags ?? [],
        email: orvalPatient.email,
        birthDate: orvalPatient.birthDate,
        gender: orvalPatient.gender,
        address: orvalPatient.address ?? patientData.address,
        notes: orvalPatient.notes,
        customData: orvalPatient.customData,
        // include any other fields present on orvalPatient
        ...(orvalPatient as any)
      };

      const response = await patientApiService.createPatient(request as any);
      return convertOrvalToLegacyPatient(response as OrvalPatient);
    },
    onSuccess: (newPatient) => {
      // Invalidate and refetch patients list
      queryClient.invalidateQueries({ queryKey: PATIENT_QUERY_KEYS.lists() });
      
      // Optimistically update cache if we have the new patient data
      if (newPatient?.id) {
        queryClient.setQueryData(
          PATIENT_QUERY_KEYS.detail(newPatient.id),
          newPatient
        );
      }
      
      console.log(PATIENT_CONSTANTS.SUCCESS_MESSAGES.PATIENT_CREATED);
    },
    onError: (error: any) => {
      console.error('Failed to create patient:', error);
      console.error(error?.response?.data?.message || 'Failed to create patient');
    },
  });
}

// Delete patient mutation
export const useDeletePatient = () => {
  const queryClient = useQueryClient();

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
      
      console.log(PATIENT_CONSTANTS.SUCCESS_MESSAGES.PATIENT_DELETED);
    },
    onError: (error) => {
      console.error('Failed to delete patient:', error);
    },
  });
};

export const usePatientNotes = (patientId: string) => {
  return useQuery({
    queryKey: PATIENT_QUERY_KEYS.notes(patientId),
    queryFn: () => patientApiService.createNote(patientId, {}), // Using available API method
    enabled: !!patientId,
  });
};

export const useCreatePatientNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, note }: { patientId: string; note: string }) => {
      return patientApiService.createNote(patientId, { content: note });
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_QUERY_KEYS.notes(patientId) });
    },
  });
};

export const useDeletePatientNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, noteId }: { patientId: string; noteId: string }) => {
      return patientApiService.deleteNote(patientId, noteId);
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_QUERY_KEYS.notes(patientId) });
    },
  });
};

export const usePatientTimeline = (patientId: string) => {
  return useQuery({
    queryKey: PATIENT_QUERY_KEYS.timeline(patientId),
    queryFn: () => patientApiService.getTimeline(patientId),
    enabled: !!patientId,
  });
};

export const usePatientSales = (patientId: string) => {
  return useQuery({
    queryKey: PATIENT_QUERY_KEYS.sales(patientId),
    queryFn: () => patientApiService.getSales(patientId),
    enabled: !!patientId,
  });
};

export const useBulkUploadPatients = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return patientApiService.bulkUpload(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PATIENT_QUERY_KEYS.lists() });
    },
  });
};

export const useSearchPatients = (searchParams: any) => {
  return useQuery({
    queryKey: [...PATIENT_QUERY_KEYS.all, 'search', searchParams],
    queryFn: () => patientApiService.search(searchParams),
    enabled: !!searchParams?.query,
  });
};

export const useExportPatients = () => {
  return useMutation({
    mutationFn: async (filters: any) => {
      return patientApiService.exportCsv(filters);
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, updates }: { patientId: string; updates: any }) => {
      // TODO: Implement patient update API when available
      throw new Error('Patient update API not yet implemented. Please update patient data manually through the backend.');
    },
    onSuccess: (updatedPatient, { patientId }) => {
      // Update cache if update succeeds
      queryClient.setQueryData(
        PATIENT_QUERY_KEYS.detail(patientId),
        updatedPatient
      );

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: PATIENT_QUERY_KEYS.lists() });

      console.log(PATIENT_CONSTANTS.SUCCESS_MESSAGES.PATIENT_UPDATED);
    },
    onError: (error: any) => {
      console.error('Failed to update patient:', error);
      console.error(error?.response?.data?.message || 'Failed to update patient');
    },
  });
};