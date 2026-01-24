import { useState, useEffect, useCallback } from 'react';
import { PartyDevice, DeviceSide, DeviceType, DeviceStatus } from '../../types/party';
import {
  listPartyDevices
} from '@/api/client/parties.client';

interface ApiResponse {
  success?: boolean;
  data?: unknown[];
  meta?: Record<string, unknown>;
}

/**
 * Hook for managing party devices
 * Fetches devices from API and provides refetch capability
 */
export function usePartyDevices(partyId: string) {
  const [devices, setDevices] = useState<PartyDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!partyId) {
      setDevices([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await listPartyDevices(partyId);

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

      // Debug logging disabled to reduce console noise
      // console.log('📥 Party devices from backend:', devicesData);
      if (devicesData.length > 0) {
        const firstDevice = devicesData[0] as Record<string, unknown>;
        console.log('📥 First device from backend:', JSON.stringify(firstDevice, null, 2));
      }

      // Map API data to PartyDevice type
      const mappedDevices: PartyDevice[] = devicesData.map((device: unknown) => {
        const d = device as Record<string, unknown>;
        return {
          ...d, // Preserve all backend fields
          id: (d.id as string) || (d.deviceId as string) || '',
          assignmentId: (d.assignmentId as string) || (d.id as string),
          brand: (d.brand as string) || '',
          model: (d.model as string) || '',
          side: ((d.side as string) || (d.ear as string) || 'left') as DeviceSide,
          ear: ((d.ear as string) || (d.side as string) || 'left') as DeviceSide,
          type: ((d.type as string) || (d.deviceType as string) || 'hearing_aid') as DeviceType,
          status: ((d.status as string) || 'active') as DeviceStatus,
          purchaseDate: (d.purchaseDate as string) || (d.purchase_date as string),
          warrantyExpiry: (d.warrantyExpiry as string) || (d.warranty_expiry as string),
          lastServiceDate: (d.lastServiceDate as string) || (d.last_service_date as string),
          price: d.price as number | undefined,
          sgkScheme: (d.sgkScheme as string) || (d.sgk_scheme as string) || '',
          paymentMethod: (d.paymentMethod as string) || (d.payment_method as string) || '',
          settings: d.settings as Record<string, unknown> | undefined,
          createdAt: (d.createdAt as string) || (d.created_at as string),
          assignedDate: (d.assignedDate as string) || (d.assigned_date as string) || (d.createdAt as string) || (d.created_at as string),
        } as PartyDevice;
      });

      setDevices(mappedDevices);
    } catch (err) {
      console.error('Failed to fetch party devices:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch party devices'));
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  // Fetch devices when partyId changes
  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]); // Intentionally only depend on partyId to avoid infinite loops

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]); // Intentionally only depend on partyId

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