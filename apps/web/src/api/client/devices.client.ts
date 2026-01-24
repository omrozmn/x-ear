/**
 * Devices API Client Adapter
 * 
 * This adapter provides a single point of import for all device-related API operations.
 * Instead of importing directly from @/api/generated/devices/devices, use this adapter.
 * 
 * Usage:
 *   import { listDevices, createDevice } from '@/api/client/devices.client';
 */

export {
  listDevices,
  getDevice,
  createDevices as createDevice,
  updateDevice,
  deleteDevice,
  createDevices,
  useListDevices,
  useGetDevice,
  useCreateDevices as useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
  getListDevicesQueryKey,
  useListDeviceCategories,
  useListDeviceBrands,
  useCreateDeviceBrands,
  getListDeviceCategoriesQueryKey,
  getListDeviceBrandsQueryKey,
} from '@/api/generated/index';

export {
  createPartyDeviceAssignments as assignDevice,
  useCreatePartyDeviceAssignments as useAssignDevice
} from '@/api/generated/index';

export type { DeviceCreate, DeviceRead, DeviceUpdate } from '@/api/generated/schemas';
