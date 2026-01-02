import { useState, useEffect, useCallback } from 'react';
import { PatientDevice } from '../../types/patient';
import { usePatientSubresourcesGetPatientDevices, patientSubresourcesGetPatientDevices } from '@/api/generated';

interface ApiResponse {
  success?: boolean;
  data?: unknown[];
  meta?: Record<string, unknown>;
}

/**
 * Hook for managing patient devices
 * Fetches devices from API and provides refetch capability
 */
export function usePatientDevices(patientId: string) {
  const [devices, setDevices] = useState<PatientDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!patientId) {
      setDevices([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await patientSubresourcesGetPatientDevices(patientId);
      
      // Handle different response structures
      let devicesData: unknown[] = [];
      
      // Check if response.data is wrapped in an envelope
      if (response && typeof response === 'object') {
        const responseObj = response as Record<string, unknown>;
        
        // Case 1: Direct array response
        if (Array.isArray(response)) {
          devicesData = response;
        }
        // Case 2: Wrapped in .data property (Axios response)
        else if (responseObj.data !== undefined) {
          const innerData = responseObj.data as Record<string, unknown>;
          // Case 2a: { data: { success: true, data: [...] } }
          if (innerData && typeof innerData === 'object' && 'data' in innerData && Array.isArray(innerData.data)) {
            devicesData = innerData.data;
          }
          // Case 2b: { data: [...] }
          else if (Array.isArray(innerData)) {
            devicesData = innerData;
          }
          // Case 2c: { data: { success: true } } but no data array
          else if (innerData && typeof innerData === 'object' && innerData.success) {
            devicesData = [];
          }
        }
      }

      console.log('📥 Patient devices from backend:', devicesData);
      
      if (devicesData.length > 0) {
        const firstDevice = devicesData[0] as Record<string, unknown>;
        console.log('📥 First device FULL:', JSON.stringify(firstDevice, null, 2));
      }

      // Map API data to PatientDevice type
      const mappedDevices: PatientDevice[] = devicesData.map((device: unknown) => {
        const d = device as Record<string, unknown>;
        return {
          ...d, // Preserve all backend fields (ear, serialNumberLeft, notes, etc.)
          id: (d.id as string) || (d.deviceId as string) || '',
          brand: (d.brand as string) || '',
          model: (d.model as string) || '',
          side: ((d.side as string) || (d.ear as string) || 'left') as PatientDevice['side'],
          ear: ((d.ear as string) || (d.side as string) || 'left') as PatientDevice['ear'],
          type: ((d.type as string) || (d.deviceType as string) || 'hearing_aid') as PatientDevice['type'],
          status: ((d.status as string) || 'active') as PatientDevice['status'],
          purchaseDate: (d.purchaseDate as string) || (d.purchase_date as string),
          warrantyExpiry: (d.warrantyExpiry as string) || (d.warranty_expiry as string),
          lastServiceDate: (d.lastServiceDate as string) || (d.last_service_date as string),
          price: d.price as number | undefined,
          sgkScheme: (d.sgkScheme as boolean) || (d.sgk_scheme as boolean),
          settings: d.settings as Record<string, unknown> | undefined,
        };
      });
      
      setDevices(mappedDevices);
    } catch (err) {
      console.error('Failed to fetch patient devices:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch patient devices'));
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Fetch devices when patientId changes
  useEffect(() => {
    fetchDevices();
  }, [patientId]); // Only depend on patientId, not fetchDevices

  // Listen for device updates
  useEffect(() => {
    const handleDeviceUpdate = () => {
      fetchDevices();
    };

    window.addEventListener('device:assigned', handleDeviceUpdate);
    window.addEventListener('device:updated', handleDeviceUpdate);
    window.addEventListener('device:removed', handleDeviceUpdate);

    return () => {
      window.removeEventListener('device:assigned', handleDeviceUpdate);
      window.removeEventListener('device:updated', handleDeviceUpdate);
      window.removeEventListener('device:removed', handleDeviceUpdate);
    };
  }, [patientId]); // Only depend on patientId, not fetchDevices

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    devices,
    data: devices,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    refetch: fetchDevices,
    clearError
  };
}