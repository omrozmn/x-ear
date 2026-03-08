/**
 * Parties API Client Adapter
 * 
 * This adapter provides a single point of import for all party-related API operations.
 * Instead of importing directly from @/api/generated/parties/parties, use this adapter.
 * 
 * Usage:
 *   import { listParties, createParty } from '@/api/client/parties.client';
 */

// Import from parties module
export {
  listParties,
  getParty,
  createParties as createParty,
  updateParty,
  deleteParty,
  getListPartiesQueryKey,
  useListParties,
  useGetParty,
  useCreateParties as useCreateParty,
  useUpdateParty,
  useDeleteParty,
} from '../generated/parties/parties';

// Import from admin-parties module
export {
  listAdminPartySales,
  getListAdminPartySalesQueryKey,
  useListAdminPartySales,
} from '../generated/admin-parties/admin-parties';

// Import from party-subresources module (only what exists)
export {
  listPartySales,
  getListPartySalesQueryKey,
  useListPartySales,
  listPartyAppointments,
  getListPartyAppointmentsQueryKey,
  useListPartyAppointments,
  listPartyNotes,
  createPartyNotes,
  updatePartyNote,
  deletePartyNote,
  getListPartyNotesQueryKey,
  useListPartyNotes,
  useCreatePartyNotes,
  useUpdatePartyNote,
  useDeletePartyNote,
  listPartyDevices,
  getListPartyDevicesQueryKey,
  useListPartyDevices,
} from '../generated/party-subresources/party-subresources';

export type { PartyCreate, PartyRead, PartyReadGender, PartyReadStatus } from '../generated/schemas';
