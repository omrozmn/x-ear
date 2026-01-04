import {
  patientsGetPatients,
  patientsCreatePatient,
  patientsDeletePatient,
  patientsSearchPatients,
  timelineGetPatientTimeline,
  timelineAddTimelineEvent,
  timelineDeleteTimelineEvent,
  timelineLogPatientActivity,
  patientsGetPatientSales,
  salesCreateSale,
  sgkUploadSgkDocument,
  sgkDeleteSgkDocument
} from '@/api/generated';
import type { CreatePatientBody } from '../../types/patient/patient.types';

export const patientsApi = {
  list: (params?: any) => patientsGetPatients(params),
  create: (data: CreatePatientBody) => patientsCreatePatient(data),
  delete: (id: string) => patientsDeletePatient(id),
  search: (query?: any) => patientsSearchPatients(query),

  // Timeline operations
  getTimeline: (patientId: string) => timelineGetPatientTimeline(patientId),
  addTimelineEvent: (patientId: string, data: any) => timelineAddTimelineEvent(patientId, data),
  deleteTimelineEvent: (patientId: string, eventId: string) => timelineDeleteTimelineEvent(patientId, eventId),
  logActivity: (patientId: string, data: any) => timelineLogPatientActivity(patientId, data),

  // Notes operations
  createNote: (patientId: string, data: any) => timelineAddTimelineEvent(patientId, data),
  deleteNote: (patientId: string, noteId: string) => timelineDeleteTimelineEvent(patientId, noteId),

  // Sales operations
  getSales: (patientId: string) => patientsGetPatientSales(patientId),
  createSale: (data: any) => salesCreateSale(data),
  // deleteSale: (saleId: string) => salesDeleteSale(saleId), // Removed as it doesn't exist

  // SGK operations
  uploadSgkDocument: (data?: any) => sgkUploadSgkDocument(data),
  deleteSgkDocument: (documentId: string) => sgkDeleteSgkDocument(documentId),
};

export default patientsApi;