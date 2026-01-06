import {
  listPatients,
  createPatient,
  deletePatient,
  updatePatient,
} from '@/api/generated/patients/patients';
import {
  getPatientTimeline,
  addTimelineEvent,
  deleteTimelineEvent
} from '@/api/generated/timeline/timeline';
import {
  getAdminPatientSales
} from '@/api/generated/admin-patients/admin-patients';
import {
  createSale
} from '@/api/generated/sales/sales';
import {
  uploadSgkDocument,
  deleteSgkDocument
} from '@/api/generated/sgk/sgk';
import type { CreatePatientBody } from '../../types/patient/patient.types';

// Wrapper to match legacy API structure
export const patientsApi = {
  list: (params?: any) => listPatients(params),
  create: (data: CreatePatientBody) => createPatient(data as any), // Type cast might be needed if CreatePatientBody differs slightly
  delete: (id: string) => deletePatient(id),
  // Search was likely same as list with query param
  search: (query?: any) => listPatients(query),

  // Timeline operations
  getTimeline: (patientId: string) => getPatientTimeline(patientId),
  addTimelineEvent: (patientId: string, data: any) => addTimelineEvent(patientId, data),
  deleteTimelineEvent: (patientId: string, eventId: string) => deleteTimelineEvent(patientId, eventId),

  // Log activity is likely same as add event
  logActivity: (patientId: string, data: any) => addTimelineEvent(patientId, data),

  // Notes operations (mapped to Timeline/Notes endpoints if available, using timeline for now as per legacy)
  createNote: (patientId: string, data: any) => addTimelineEvent(patientId, data),
  deleteNote: (patientId: string, noteId: string) => deleteTimelineEvent(patientId, noteId),

  // Sales operations
  getSales: (patientId: string) => getAdminPatientSales(patientId),
  createSale: (data: any) => createSale(data),

  // SGK operations
  uploadSgkDocument: (data?: any) => uploadSgkDocument(data),
  deleteSgkDocument: (documentId: string) => deleteSgkDocument(documentId),
};

export default patientsApi;