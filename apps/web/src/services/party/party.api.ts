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
import type { PartyCreate } from '@/api/generated/schemas';

// Wrapper to match legacy API structure
export const partiesApi = {
  list: (params?: any) => listParties(params),
  create: (data: PartyCreate) => createParty(data),
  delete: (id: string) => deleteParty(id),
  update: (id: string, data: any) => updateParty(id, data),
  // Search was likely same as list with query param
  search: (query?: any) => listParties(query),

  // Timeline operations
  getTimeline: (partyId: string) => listPartyTimeline(partyId),
  createPartyTimeline: (partyId: string, data: any) => createPartyTimeline(partyId, data),
  deletePartyTimeline: (partyId: string, eventId: string) => deletePartyTimeline(partyId, eventId),

  // Log activity
  logActivity: (partyId: string, data: any) => createPartyActivities(partyId, data),

  // Notes operations (mapped to Timeline/Notes endpoints)
  // Note: party-subresources has listPartyNotes, createPartyNotes, etc.
  // But legacy used timeline. We'll stick to timeline for activity but maybe use notes for notes.
  // For now, staying consistent with what was there but using new names.
  createNote: (partyId: string, data: any) => createPartyTimeline(partyId, data),
  deleteNote: (partyId: string, noteId: string) => deletePartyTimeline(partyId, noteId),

  // Sales operations
  getSales: (partyId: string) => listAdminPartySales(partyId),
  createSale: (data: any) => createSales(data),

  // SGK operations
  createSgkDocuments: (data?: any) => createSgkDocuments(data),
  deleteSgkDocument: (documentId: string) => deleteSgkDocument(documentId),
};

export default partiesApi;