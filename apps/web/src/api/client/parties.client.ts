/**
 * Parties API Client Adapter
 * 
 * This adapter provides a single point of import for all party-related API operations.
 * Instead of importing directly from @/api/generated/parties/parties, use this adapter.
 * 
 * Usage:
 *   import { listParties, createParty } from '@/api/client/parties.client';
 */

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
  listAdminPartySales,
  getListAdminPartySalesQueryKey,
  useListAdminPartySales,
  listPartyTimeline,
  createPartyTimeline,
  createPartyActivities,
  deletePartyTimeline,
  getListPartyTimelineQueryKey,
  useListPartyTimeline,
  useCreatePartyTimeline,
  useCreatePartyActivities,
  useDeletePartyTimeline,
  listSgkDocuments,
  createSgkDocuments,
  deleteSgkDocument,
  getListSgkDocumentsQueryKey,
  useListSgkDocuments,
  useCreateSgkDocuments,
  useDeleteSgkDocument,
  listPatientDocuments,
  getListPatientDocumentsQueryKey,
  useListPatientDocuments,
  listHearingTests,
  getListHearingTestsQueryKey,
  useListHearingTests,
  listPartyAppointments,
  listPartyNotes,
  createPartyNotes,
  updatePartyNote,
  deletePartyNote,
  listPartyDevices,
  getListPartyAppointmentsQueryKey,
  getListPartyNotesQueryKey,
  getListPartyDevicesQueryKey,
  useListPartyAppointments,
  useListPartyNotes,
  useCreatePartyNotes,
  useUpdatePartyNote,
  useDeletePartyNote,
  useListPartyDevices,
} from '@/api/generated/index';

export type { PartyCreate } from '@/api/generated/schemas';
