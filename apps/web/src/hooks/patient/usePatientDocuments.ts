import { useState, useEffect, useCallback } from 'react';
import { patientApiService } from '../../services/patient/patient-api.service';

export interface PatientDocument {
  id: string;
  patientId: string;
  documentType: 'medical_record' | 'prescription' | 'test_result' | 'invoice' | 'consent' | 'other';
  title: string;
  description?: string;
  fileName: string;
  originalName?: string;
  content?: string;
  metadata?: Record<string, any>;
  mimeType?: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadDate: string;
  createdBy?: string;
  createdAt?: string;
  tags?: string[];
  status?: string;
}

/**
 * Hook for fetching and managing patient documents
 */
export function usePatientDocuments(patientId?: string) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  // Fetch documents for a patient
  const fetchDocuments = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await patientApiService.getDocuments(id);
      setDocuments((result?.data || []) as PatientDocument[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load documents on mount or when patientId changes
  useEffect(() => {
    if (patientId) {
      fetchDocuments(patientId);
    } else {
      setDocuments([]);
    }
  }, [patientId, fetchDocuments]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    documents,
    data: documents,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    fetchDocuments,
    clearError
  };
}