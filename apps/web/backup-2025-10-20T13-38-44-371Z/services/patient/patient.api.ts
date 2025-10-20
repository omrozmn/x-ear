// Thin API wrapper for patients that uses Orval generated client.
// Purpose: single responsibility file that re-exports generated methods and
// adapts shapes only when necessary. No manual fetch()

import * as api from '../../generated/orval-api';
import type { CreatePatientBody } from '../../types/patient/patient.types';

export const patientsApi = {
  list: (params?: any) => api.patientsGetPatients(params),
  create: (body: CreatePatientBody, options?: any) => api.patientsCreatePatient(body, options),
  delete: (id: string, options?: any) => api.patientsDeletePatient(id, options),

  // patient subresources
  createNote: (patientId: string, body: any, options?: any) => api.patientSubresourcesCreatePatientNote(patientId, body, options),
  deleteNote: (patientId: string, noteId: string, options?: any) => api.patientSubresourcesDeletePatientNote(patientId, noteId, options),
  
  createEReceipt: (patientId: string, body: any, options?: any) => api.patientSubresourcesCreatePatientEreceipt(patientId, body, options),
  deleteEReceipt: (patientId: string, ereceiptId: string, options?: any) => api.patientSubresourcesDeletePatientEreceipt(patientId, ereceiptId, options),
  
  addHearingTest: (patientId: string, body: any, options?: any) => api.patientSubresourcesAddPatientHearingTest(patientId, body, options),
  deleteHearingTest: (patientId: string, testId: string, options?: any) => api.patientSubresourcesDeletePatientHearingTest(patientId, testId, options),

  // patient sales and timeline
  getSales: (patientId: string, options?: any) => api.salesGetPatientSales(patientId, options),
  getSgkDocuments: (patientId: string, options?: any) => api.sgkGetPatientSgkDocuments(patientId, options),
  getTimeline: (patientId: string, options?: any) => api.timelineGetPatientTimeline(patientId, options),
  addTimelineEvent: (patientId: string, body: any, options?: any) => api.timelineAddTimelineEvent(patientId, body, options),
  deleteTimelineEvent: (patientId: string, eventId: string, options?: any) => api.timelineDeleteTimelineEvent(patientId, eventId, options),
  logActivity: (patientId: string, body: any, options?: any) => api.timelineLogPatientActivity(patientId, body, options),

  // bulk operations and exports
  bulkUpload: (body?: any, options?: any) => api.patientsBulkUploadPatients(body, options),
  exportCsv: (options?: any) => api.patientsExportPatientsCsv(options),
  search: (params?: any, options?: any) => api.patientsSearchPatients({ ...options, params }),

  // device assignment
  assignDevicesExtended: (patientId: string, body: any, options?: any) => api.salesAssignDevicesExtended(patientId, body, options),
};

export default patientsApi;