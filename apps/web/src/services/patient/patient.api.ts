// Thin API wrapper for patients that uses Orval generated client.
// Purpose: single responsibility file that re-exports generated methods and
// adapts shapes only when necessary. No manual fetch()

import { getPatients } from '../../api/generated/patients/patients';
import { getTimeline } from '../../api/generated/timeline/timeline';
import { getSales } from '../../api/generated/sales/sales';
import { getSgk } from '../../api/generated/sgk/sgk';
import type { CreatePatientBody } from '../../types/patient/patient.types';

export const patientsApi = {
  list: (params?: any) => {
    const api = getPatients();
    return api.patientsGetPatients(params);
  },
  create: (body: CreatePatientBody, options?: any) => {
    const api = getPatients();
    return api.patientsCreatePatient(body, options);
  },
  delete: (id: string, options?: any) => {
    const api = getPatients();
    return api.patientsDeletePatient(id, options);
  },

  // patient subresources
  createNote: (patientId: string, body: any, options?: any) => {
    const api = getPatients();
    return api.patientSubresourcesCreatePatientNote(patientId, body, options);
  },
  deleteNote: (patientId: string, noteId: string, options?: any) => {
    const api = getPatients();
    return api.patientSubresourcesDeletePatientNote(patientId, noteId, options);
  },
  
  createEReceipt: (patientId: string, body: any, options?: any) => {
    const api = getPatients();
    return api.patientSubresourcesCreatePatientEreceipt(patientId, body, options);
  },
  deleteEReceipt: (patientId: string, ereceiptId: string, options?: any) => {
    const api = getPatients();
    return api.patientSubresourcesDeletePatientEreceipt(patientId, ereceiptId, options);
  },
  
  addHearingTest: (patientId: string, body: any, options?: any) => {
    const api = getPatients();
    return api.patientSubresourcesAddPatientHearingTest(patientId, body, options);
  },
  deleteHearingTest: (patientId: string, testId: string, options?: any) => {
    const api = getPatients();
    return api.patientSubresourcesDeletePatientHearingTest(patientId, testId, options);
  },

  // patient sales and timeline
  getSales: (patientId: string, options?: any) => {
    const api = getPatients();
    return api.salesGetPatientSales(patientId, options);
  },
  getSgkDocuments: (patientId: string, options?: any) => {
    const api = getPatients();
    return api.sgkGetPatientSgkDocuments(patientId, options);
  },
  getTimeline: (patientId: string, options?: any) => {
    const api = getTimeline();
    return api.timelineGetPatientTimeline(patientId, options);
  },
  addTimelineEvent: (patientId: string, body: any, options?: any) => {
    const api = getTimeline();
    return api.timelineAddTimelineEvent(patientId, body, options);
  },
  deleteTimelineEvent: (patientId: string, eventId: string, options?: any) => {
    const api = getTimeline();
    return api.timelineDeleteTimelineEvent(patientId, eventId, options);
  },
  logActivity: (patientId: string, body: any, options?: any) => {
    const api = getTimeline();
    return api.timelineLogPatientActivity(patientId, body, options);
  },

  // bulk operations and exports
  bulkUpload: (body?: any, options?: any) => {
    const api = getPatients();
    return api.patientsBulkUploadPatients(body, options);
  },
  exportCsv: (options?: any) => {
    const api = getPatients();
    return api.patientsExportPatientsCsv(options);
  },
  search: (params?: any, options?: any) => {
    const api = getPatients();
    return api.patientsSearchPatients({ ...options, params });
  },

  // device assignment
  assignDevicesExtended: (patientId: string, body: any, options?: any) => {
    const api = getPatients();
    return api.salesAssignDevicesExtended(patientId, body, options);
  },
};

export default patientsApi;