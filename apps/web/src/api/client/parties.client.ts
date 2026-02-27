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
  // deleteSgkDocument, // Endpoint disabled in backend
  getListSgkDocumentsQueryKey,
  useListSgkDocuments,
  useCreateSgkDocuments,
  // useDeleteSgkDocument, // Endpoint disabled in backend
  listPatientDocuments,
  getListPatientDocumentsQueryKey,
  useListPatientDocuments,
  // listHearingTests, // Endpoint removed/renamed in backend
  // createHearingTest, // Endpoint removed/renamed in backend
  // getListHearingTestsQueryKey, // Endpoint removed/renamed in backend
  // useListHearingTests, // Endpoint removed/renamed in backend
  // useCreateHearingTest, // Endpoint removed/renamed in backend
  // listHearingEReceipts, // Endpoint removed/renamed in backend
  // createHearingEReceipt, // Endpoint removed/renamed in backend
  // updateHearingEReceipt, // Endpoint removed/renamed in backend
  // deleteHearingEReceipt, // Endpoint removed/renamed in backend
  // getListHearingEReceiptsQueryKey, // Endpoint removed/renamed in backend
  // useListHearingEReceipts, // Endpoint removed/renamed in backend
  // useCreateHearingEReceipt, // Endpoint removed/renamed in backend
  // useUpdateHearingEReceipt, // Endpoint removed/renamed in backend
  // useDeleteHearingEReceipt, // Endpoint removed/renamed in backend
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

export type { PartyCreate, PartyRead, PartyReadGender, PartyReadStatus } from '@/api/generated/schemas';
