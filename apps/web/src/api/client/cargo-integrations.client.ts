/**
 * Cargo Integrations API Client Adapter
 */
export {
  listCargoIntegrations,
  createCargoIntegration,
  updateCargoIntegration,
  deleteCargoIntegration,
  testCargoIntegration,
  getListCargoIntegrationsQueryKey,
  useListCargoIntegrations,
  useCreateCargoIntegration,
  useUpdateCargoIntegration,
  useDeleteCargoIntegration,
  useTestCargoIntegration,
} from '@/api/generated/index';

export type {
  CargoIntegrationCreate,
  CargoIntegrationUpdate,
  CargoIntegrationRead,
} from '@/api/generated/schemas';
