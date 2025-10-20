import { Patient as OrvalPatient, PatientStatus } from '../../generated/orval-types';
import { Patient as LegacyPatient, PatientDevice, PatientNote, SGKInfo, Sale, Installment } from '../patient';

/**
 * Converts an Orval-generated Patient to the legacy Patient interface
 * This adapter handles the differences between the API contract and the UI expectations
 */
export function convertOrvalToLegacyPatient(orvalPatient: OrvalPatient): LegacyPatient {
  // Generate a display name from firstName and lastName
  
  // Map status to legacy format
  const status = orvalPatient.status || 'active';
  
  // Default values for legacy fields that don't exist in Orval
  const defaultSGKInfo: SGKInfo = {
    hasInsurance: false,
    insuranceNumber: undefined,
    insuranceType: undefined,
    coveragePercentage: undefined,
    approvalNumber: undefined,
    approvalDate: undefined,
    expiryDate: undefined
  };

  // Convert SGK info safely
  const sgkInfo: SGKInfo = orvalPatient.sgkInfo 
    ? {
        hasInsurance: Boolean((orvalPatient.sgkInfo as any).hasInsurance),
        insuranceNumber: (orvalPatient.sgkInfo as any).insuranceNumber,
        insuranceType: (orvalPatient.sgkInfo as any).insuranceType,
        coveragePercentage: (orvalPatient.sgkInfo as any).coveragePercentage,
        approvalNumber: (orvalPatient.sgkInfo as any).approvalNumber,
        approvalDate: (orvalPatient.sgkInfo as any).approvalDate,
        expiryDate: (orvalPatient.sgkInfo as any).expiryDate
      }
    : defaultSGKInfo;

  return {
    // Basic info
    id: orvalPatient.id || '',
    firstName: orvalPatient.firstName,
    lastName: orvalPatient.lastName,
    phone: orvalPatient.phone,
    tcNumber: orvalPatient.tcNumber,
    birthDate: orvalPatient.birthDate,
    email: orvalPatient.email,
    address: orvalPatient.addressFull,
    
    // Status and classification - map to legacy values
    status: (status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    segment: (orvalPatient.segment as any) || 'new',
    label: (orvalPatient.conversionStep as any) || 'yeni',
    acquisitionType: (orvalPatient.acquisitionType as any) || 'tabela',
    
    // Tags and priority
    tags: orvalPatient.tags || [],
    priorityScore: orvalPatient.priorityScore,
    
    // Device information - defaults since not in Orval
    devices: [] as PatientDevice[],
    deviceTrial: false,
    trialDevice: undefined,
    trialDate: undefined,
    priceGiven: false,
    purchased: false,
    purchaseDate: undefined,
    deviceType: undefined,
    deviceModel: undefined,
    
    // Financial information - defaults
    installments: [] as Installment[],
    sales: [] as Sale[],
    overdueAmount: 0,
    
    // SGK information
    sgkInfo,
    sgkStatus: undefined,
    sgkSubmittedDate: undefined,
    sgkDeadline: undefined,
    sgkWorkflow: undefined,
    deviceReportRequired: false,
    batteryReportRequired: false,
    batteryReportDue: undefined,
    
    // Appointments and communication - defaults
    lastContactDate: undefined,
    lastAppointmentDate: undefined,
    missedAppointments: 0,
    lastPriorityTaskDate: undefined,
    renewalContactMade: false,
    
    // Assignment
    assignedClinician: undefined,
    
    // Timestamps
    createdAt: orvalPatient.createdAt || new Date().toISOString(),
    updatedAt: orvalPatient.updatedAt || new Date().toISOString(),
    
    // Additional collections - defaults
    notes: [] as PatientNote[],
    communications: undefined,
    reports: undefined,
    ereceiptHistory: undefined,
    appointments: undefined
  };
}

/**
 * Converts a legacy Patient to Orval Patient format for API calls
 */
export function convertLegacyToOrvalPatient(legacyPatient: LegacyPatient): Partial<OrvalPatient> {
  return {
    id: legacyPatient.id,
    firstName: legacyPatient.firstName,
    lastName: legacyPatient.lastName,
    phone: legacyPatient.phone,
    tcNumber: legacyPatient.tcNumber,
    birthDate: legacyPatient.birthDate,
    email: legacyPatient.email,
    addressFull: legacyPatient.address,
    status: legacyPatient.status as PatientStatus,
    segment: legacyPatient.segment as any,
    acquisitionType: legacyPatient.acquisitionType as any,
    tags: legacyPatient.tags,
    priorityScore: legacyPatient.priorityScore,
    sgkInfo: legacyPatient.sgkInfo as any,
    createdAt: legacyPatient.createdAt,
    updatedAt: legacyPatient.updatedAt
  };
}

/**
 * Creates a patient request from form data
 */
export function createPatientRequest(formData: {
  firstName: string;
  lastName: string;
  phone: string;
  tcNumber?: string;
  email?: string;
  birthDate?: string;
  address?: string;
  status?: string;
  segment?: string;
  acquisitionType?: string;
  tags?: string[];
}): Partial<OrvalPatient> {
  return {
    firstName: formData.firstName,
    lastName: formData.lastName,
    phone: formData.phone,
    tcNumber: formData.tcNumber,
    email: formData.email,
    birthDate: formData.birthDate,
    addressFull: formData.address,
    status: (formData.status as PatientStatus) || 'active',
    segment: formData.segment as any,
    acquisitionType: formData.acquisitionType as any,
    tags: formData.tags || []
  };
}