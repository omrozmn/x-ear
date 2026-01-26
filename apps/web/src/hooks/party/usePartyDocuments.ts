import { useState, useEffect, useCallback } from 'react';
import { partyApiService } from '../../services/party/party-api.service';

export interface PartyDocument {
  id: string;
  partyId: string;
  documentType: 'medical_record' | 'prescription' | 'test_result' | 'invoice' | 'consent' | 'other';
  title: string;
  description?: string;
  fileName: string;
  originalName?: string;
  content?: string;
  metadata?: Record<string, unknown>;
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
 * Hook for fetching and managing party documents
 */
export function usePartyDocuments(partyId?: string) {
  const [documents, setDocuments] = useState<PartyDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  // Fetch documents for a party
  const fetchDocuments = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await partyApiService.getDocuments(id);
      setDocuments((result?.data || []) as PartyDocument[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load documents on mount or when partyId changes
  useEffect(() => {
    if (partyId) {
      fetchDocuments(partyId);
    } else {
      setDocuments([]);
    }
  }, [partyId, fetchDocuments]);

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