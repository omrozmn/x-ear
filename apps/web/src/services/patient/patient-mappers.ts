/**
 * Orval -> Domain Patient mappers
 * Provides safe conversion from the API (orval-generated) Patient shape
 * into the internal domain Patient type used throughout the app.
 */
import type { Patient as OrvalPatient, PatientStatus as OrvalPatientStatus } from "../../api/generated/api.schemas";
import type { Patient as DomainPatient, PatientStatus as DomainPatientStatus, PatientSegment as DomainPatientSegment, PatientLabel as DomainPatientLabel, PatientAcquisitionType as DomainPatientAcquisitionType } from '../../types/patient/patient-base.types';

// Type mapping functions
function mapOrvalStatusToDomain(orvalStatus?: OrvalPatientStatus): DomainPatientStatus {
  switch (orvalStatus) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'INACTIVE':
      return 'INACTIVE';
    case 'LEAD':
    case 'TRIAL':
    case 'CUSTOMER':
      return 'ACTIVE'; // Map these to active for now
    default:
      return 'ACTIVE';
  }
}

function mapOrvalSegmentToDomain(segment?: string): DomainPatientSegment {
  if (!segment) return 'NEW';
  
  const upperSegment = segment.toUpperCase();
  switch (upperSegment) {
    case 'NEW':
    case 'TRIAL':
    case 'PURCHASED':
    case 'CONTROL':
    case 'RENEWAL':
    case 'EXISTING':
    case 'VIP':
      return upperSegment as DomainPatientSegment;
    default:
      return 'NEW';
  }
}

function mapOrvalAcquisitionTypeToDomain(acquisitionType?: string): DomainPatientAcquisitionType {
  if (!acquisitionType) return 'diger';
  
  const lowerType = acquisitionType.toLowerCase();
  switch (lowerType) {
    case 'tabela':
    case 'sosyal-medya':
    case 'tanitim':
    case 'referans':
    case 'diger':
      return lowerType as DomainPatientAcquisitionType;
    default:
      return 'diger';
  }
}

export function convertOrvalPatient(orval: Partial<OrvalPatient> | null | undefined): DomainPatient {
  // Defensive defaults for fields that the domain expects as non-nullable
  const id = orval?.id ?? '';

  const firstName = orval?.firstName ?? orval?.first_name ?? '';
  const lastName = orval?.lastName ?? orval?.last_name ?? '';

  const phone = orval?.phone ?? '';

  // Map address - prefer full address, then city/district
  let address: string | undefined;
  const addrField = (orval as any)?.address;
  if (addrField && typeof addrField === 'object' && addrField.city) {
    // Handle case where address is returned as an object {city, district, fullAddress}
    const addrObj = addrField as { city?: string; district?: string; fullAddress?: string };
    address = addrObj.fullAddress || [addrObj.city, addrObj.district].filter(Boolean).join(', ');
  } else {
    // Handle separate fields or string
    address = (orval?.addressFull ?? orval?.address_full ?? [orval?.addressCity, orval?.addressDistrict].filter(Boolean).join(', ')) || undefined;
  }

  // Map status/segment with conservative fallbacks and proper type conversion
  const status = mapOrvalStatusToDomain(orval?.status) ?? 'ACTIVE';
  const segment = mapOrvalSegmentToDomain(orval?.segment) ?? 'NEW';
  const acquisitionType = mapOrvalAcquisitionTypeToDomain(orval?.acquisitionType ?? orval?.acquisition_type) ?? 'diger';

  // Many of the richer domain fields are not present in the API model; provide sensible defaults
  const domain: DomainPatient = {
    id,
    firstName: firstName,
    lastName: lastName,
    phone,
    tcNumber: orval?.tcNumber ?? orval?.tc_number ?? undefined,
    birthDate: orval?.birthDate ?? orval?.birth_date ?? undefined,
    email: orval?.email ?? undefined,
    address: address as string | undefined,
    addressFull: (orval?.addressFull ?? orval?.address_full ?? addrField?.fullAddress) as string | undefined,

    status: status,
    segment: segment,
    label: 'yeni',
    acquisitionType: acquisitionType,

    tags: Array.isArray(orval?.tags) ? orval!.tags! : [],
    priorityScore: typeof orval?.priorityScore === 'number' ? orval.priorityScore : undefined,

    deviceTrial: undefined,
    trialDevice: undefined,
    trialDate: undefined,
    priceGiven: undefined,
    purchased: undefined,
    purchaseDate: undefined,
    deviceType: undefined,
    deviceModel: undefined,

    overdueAmount: undefined,

    sgkStatus: undefined,
    sgkSubmittedDate: undefined,
    sgkDeadline: undefined,
    deviceReportRequired: undefined,
    batteryReportRequired: undefined,
    batteryReportDue: undefined,

    lastContactDate: undefined,
    lastAppointmentDate: undefined,
    missedAppointments: undefined,
    lastPriorityTaskDate: undefined,
    renewalContactMade: undefined,

    assignedClinician: undefined,

    createdAt: orval?.createdAt ?? new Date().toISOString(),
    updatedAt: orval?.updatedAt ?? new Date().toISOString(),

    devices: [],
    notes: [],
    communications: undefined,
    reports: undefined,
    ereceiptHistory: undefined,
    appointments: undefined,
    installments: undefined,
    sales: undefined,
    sgkInfo: (orval?.sgkInfo as any) ?? (orval?.sgk_info as any) ?? ({} as any),
    sgkWorkflow: undefined,
  };

  return domain;
}

export default convertOrvalPatient;