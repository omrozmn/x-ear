import { getSgk } from '../../api/generated/sgk/sgk';
import { getOcr } from '../../api/generated/ocr/ocr';
import { getAutomation } from '../../api/generated/automation/automation';
import { getPatients } from '../../api/generated/patients/patients';

const sgkApi = getSgk();
const ocrApi = getOcr();
const automationApi = getAutomation();
const patientsApi = getPatients();

// SGK Service - handles SGK document operations
export const sgkService = {
  // Upload SGK document
  uploadDocument: (body?: any, opts?: any) => sgkApi.sgkUploadSgkDocument(body, opts),
  
  // Delete SGK document
  deleteDocument: (documentId: string, opts?: any) => sgkApi.sgkDeleteSgkDocument(documentId, opts),
  
  // List SGK documents for a patient
  listDocuments: (patientId: string, opts?: any) => patientsApi.sgkGetPatientSgkDocuments(patientId, opts),
  
  // Process OCR
  processOcr: (body?: any, opts?: any) => ocrApi.sgkProcessOcr(body, opts),
  
  // Trigger SGK processing
  triggerProcessing: (body?: any, opts?: any) => automationApi.automationTriggerSgkProcessing(body, opts),
};

export default sgkService;
