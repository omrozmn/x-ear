import {
  listParties,
  createParty,
  deleteParty,
  updateParty,
} from '@/api/client/parties.client';
import {
  listPartyTimeline,
  createPartyTimeline,
  deletePartyTimeline,
  createPartyActivities
} from '@/api/client/parties.client';
import {
  listAdminPartySales
} from '@/api/client/parties.client';
import {
  createSales
} from '@/api/client/sales.client';
import {
  createSgkDocuments,
  deleteSgkDocument
} from '@/api/client/sgk.client';
import type {
  PartyCreate,
  ListPartiesParams,
  PartyUpdate,
  TimelineEventCreate,
  SaleCreate,
  UploadSGKDocumentRequest
} from '@/api/generated/schemas';

// Wrapper to match legacy API structure
export const partiesApi = {
  list: (params?: ListPartiesParams) => listParties(params),
  create: (data: PartyCreate) => createParty(data),
  delete: (id: string) => deleteParty(id),
  update: (id: string, data: PartyUpdate) => updateParty(id, data),
  // Search was likely same as list with query param
  search: (query?: ListPartiesParams) => listParties(query),

  // Timeline operations
  getTimeline: (partyId: string) => listPartyTimeline(partyId),
  createPartyTimeline: (partyId: string, data: TimelineEventCreate) => createPartyTimeline(partyId, data),
  deletePartyTimeline: (partyId: string, eventId: string) => deletePartyTimeline(partyId, eventId),

  // Log activity
  logActivity: (partyId: string, data: TimelineEventCreate) => createPartyActivities(partyId, data),

  // Notes operations (mapped to Timeline/Notes endpoints)
  // Note: party-subresources has listPartyNotes, createPartyNotes, etc.
  createNote: (partyId: string, data: TimelineEventCreate) => createPartyTimeline(partyId, data),
  deleteNote: (partyId: string, noteId: string) => deletePartyTimeline(partyId, noteId),

  // Sales operations
  getSales: (partyId: string) => listAdminPartySales(partyId),
  createSale: (data: SaleCreate) => createSales(data),

  // SGK operations
  createSgkDocuments: (data: UploadSGKDocumentRequest) => createSgkDocuments(data),
  deleteSgkDocument: (documentId: string) => deleteSgkDocument(documentId),
};

export default partiesApi;