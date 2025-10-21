// Simplified usePatient hook
import { useState, useEffect } from 'react';
import { Patient } from '../types/patient';
import { apiClient } from '../api/client';

export const usePatient = (patientId?: string) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      setLoading(true);
      apiClient.getPatient(patientId)
        .then(response => {
          if (response.data?.patient) {
            setPatient(response.data.patient as any);
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [patientId]);

  const updatePatient = async (updates: Partial<Patient>) => {
    if (!patientId) return null;
    
    try {
      setLoading(true);
      const response = await apiClient.updatePatient(patientId, updates);
      if (response.data?.patient) {
        setPatient(response.data.patient as any);
        return response.data.patient;
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deletePatient = async () => {
    if (!patientId) return false;
    
    try {
      setLoading(true);
      const response = await apiClient.deletePatient(patientId);
      return response.data?.success || false;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    patient,
    loading,
    error,
    updatePatient,
    deletePatient,
    // Mock implementations for compatibility
    sales: [],
    timeline: [],
    sgk: [],
    appointments: [],
    hearingTests: [],
    notes: [],
    devices: [],
    refreshPatient: () => Promise.resolve(),
    createSale: () => Promise.resolve({}),
    updateSale: () => Promise.resolve({}),
    getSales: () => Promise.resolve({ data: [], success: true }),
    getTimeline: () => Promise.resolve({ data: [], success: true }),
    getSgk: () => Promise.resolve({ data: [], success: true }),
    getAppointments: () => Promise.resolve({ data: [], success: true }),
    getHearingTests: () => Promise.resolve({ data: [], success: true }),
    getNotes: () => Promise.resolve({ data: [], success: true }),
    createNote: () => Promise.resolve({}),
    deleteNote: () => Promise.resolve(true),
    bulkUpload: () => Promise.resolve(true),
    exportCsv: () => Promise.resolve(true),
    search: () => Promise.resolve({ data: [], success: true })
  };
};