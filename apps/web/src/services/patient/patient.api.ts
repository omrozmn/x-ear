import {
  listPatients,
  createPatients,
  deletePatient,
  updatePatient,
} from '@/api/generated/patients/patients';
import {
  listPatientTimeline,
  createPatientTimeline,
  deletePatientTimeline
} from '@/api/generated/timeline/timeline';
import {
  listAdminPatientSales
} from '@/api/generated/admin-patients/admin-patients';
import {
  createSales
} from '@/api/generated/sales/sales';
import {
  createSgkDocuments,
  deleteSgkDocument
} from '@/api/generated/sgk/sgk';
import type { CreatePatientBody } from '../../types/patient/patient.types';

// Wrapper to match legacy API structure
export const patientsApi = {
  list: (params?: any) => listPatients(params),
  create: (data: CreatePatientBody) => createPatients(data as any), // Type cast might be needed if CreatePatientBody differs slightly
  delete: (id: string) => deletePatient(id),
  // Search was likely same as list with query param
  search: (query?: any) => listPatients(query),

  // Timeline operations
  getTimeline: (patientId: string) => listPatientTimeline(patientId),
  createPatientTimeline: (patientId: string, data: any) => createPatientTimeline(patientId, data),
  deletePatientTimeline: (patientId: string, eventId: string) => deletePatientTimeline(patientId, eventId),

  // Log activity is likely same as add event
  logActivity: (patientId: string, data: any) => createPatientTimeline(patientId, data),

  // Notes operations (mapped to Timeline/Notes endpoints if available, using timeline for now as per legacy)
  createNote: (patientId: string, data: any) => createPatientTimeline(patientId, data),
  deleteNote: (patientId: string, noteId: string) => deletePatientTimeline(patientId, noteId),

  // Sales operations
  getSales: (patientId: string) => listAdminPatientSales(patientId),
  createSale: (data: any) => createSales(data),

  // SGK operations
  createSgkDocuments: (data?: any) => createSgkDocuments(data),
  deleteSgkDocument: (documentId: string) => deleteSgkDocument(documentId),
};

export default patientsApi;