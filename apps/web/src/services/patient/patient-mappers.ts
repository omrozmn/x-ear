/**
 * Orval -> Domain Patient mappers
 * Provides safe conversion from the API (orval-generated) Patient shape
 * into the internal domain Patient type used throughout the app.
 */
import type { Patient as OrvalPatient } from '../../generated/orval-api';
import type { Patient as DomainPatient } from '../../types/patient/patient-base.types';

export function convertOrvalPatient(orval: Partial<OrvalPatient> | null | undefined): DomainPatient {
  // Defensive defaults for fields that the domain expects as non-nullable
  const id = orval?.id ?? '';

  const firstName = orval?.firstName ?? orval?.first_name ?? '';
  const lastName = orval?.lastName ?? orval?.last_name ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || firstName || lastName || 'Unnamed Patient';

  const phone = orval?.phone ?? '';

  // Map address - prefer full address, then city/district
  const address = (orval?.addressFull ?? orval?.address_full ?? [orval?.addressCity, orval?.addressDistrict].filter(Boolean).join(', ')) || undefined;

  // Map status/segment with conservative fallbacks
  const status = (orval?.status as DomainPatient['status']) ?? 'active';
  const segment = (orval?.segment as DomainPatient['segment']) ?? ('new' as DomainPatient['segment']);

  // Many of the richer domain fields are not present in the API model; provide sensible defaults
  const domain: DomainPatient = {
    id,
    name,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone,
    tcNumber: orval?.tcNumber ?? orval?.tc_number ?? undefined,
    birthDate: orval?.birthDate ?? orval?.birth_date ?? undefined,
    email: orval?.email ?? undefined,
    address: address as string | undefined,

    status: status,
    segment: segment,
    label: 'yeni',
    acquisitionType: (orval?.acquisitionType as DomainPatient['acquisitionType']) ?? ('diger' as DomainPatient['acquisitionType']),

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
