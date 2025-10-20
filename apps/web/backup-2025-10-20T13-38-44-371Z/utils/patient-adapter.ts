/**
 * Patient adapter utilities for converting between Orval and Legacy patient types
 */

import { Patient as OrvalPatient } from '../generated/orval-types';
import { Patient as LegacyPatient } from '../types/patient';

/**
 * Convert Orval patient to legacy patient format
 */
export function convertOrvalToLegacyPatient(orvalPatient: OrvalPatient): LegacyPatient {
  return {
    id: orvalPatient.id || '',
    tcNumber: orvalPatient.tcNumber,
    firstName: orvalPatient.firstName,
    lastName: orvalPatient.lastName,
    phone: orvalPatient.phone || '',
    email: orvalPatient.email,
    birthDate: orvalPatient.birthDate,
    gender: orvalPatient.gender,
    addressCity: orvalPatient.addressCity,
    addressDistrict: orvalPatient.addressDistrict,
    addressFull: orvalPatient.addressFull,
    status: orvalPatient.status === 'active' ? 'active' : 'inactive',
    segment: (orvalPatient.segment ?? 'existing') as LegacyPatient['segment'],
    acquisitionType: orvalPatient.acquisitionType,
    conversionStep: orvalPatient.conversionStep,
    referredBy: orvalPatient.referredBy,
    priorityScore: orvalPatient.priorityScore,
    tags: orvalPatient.tags || [],
    sgkInfo: orvalPatient.sgkInfo,
    customData: orvalPatient.customData,
    createdAt: orvalPatient.createdAt,
    updatedAt: orvalPatient.updatedAt,
    // Legacy fields
    label: `${orvalPatient.firstName} ${orvalPatient.lastName}`,
    devices: [],
    notes: []
  };
}

/**
 * Convert legacy patient to Orval patient format
 */
export function convertLegacyToOrvalPatient(legacyPatient: LegacyPatient): OrvalPatient {
  return {
    id: legacyPatient.id,
    tcNumber: legacyPatient.tcNumber,
    firstName: legacyPatient.firstName,
    lastName: legacyPatient.lastName,
    phone: legacyPatient.phone,
    email: legacyPatient.email,
    birthDate: legacyPatient.birthDate,
    gender: legacyPatient.gender,
    addressCity: legacyPatient.addressCity,
    addressDistrict: legacyPatient.addressDistrict,
    addressFull: legacyPatient.addressFull,
    status: legacyPatient.status === 'active' ? 'active' : 'inactive',
    segment: legacyPatient.segment,
    acquisitionType: legacyPatient.acquisitionType,
    conversionStep: legacyPatient.conversionStep,
    referredBy: legacyPatient.referredBy,
    priorityScore: legacyPatient.priorityScore,
    tags: legacyPatient.tags,
    sgkInfo: legacyPatient.sgkInfo,
    customData: legacyPatient.customData,
    createdAt: legacyPatient.createdAt,
    updatedAt: legacyPatient.updatedAt
  };
}

/**
 * Create patient request from form data
 */
export function createPatientRequestFromFormData(formData: Partial<LegacyPatient>): any {
  return {
    tcNumber: formData.tcNumber,
    firstName: formData.firstName,
    lastName: formData.lastName,
    phone: formData.phone,
    email: formData.email,
    birthDate: formData.birthDate,
    gender: formData.gender,
    addressCity: formData.addressCity,
    addressDistrict: formData.addressDistrict,
    addressFull: formData.addressFull || '',
    status: formData.status === 'active' ? 'active' : 'inactive',
    segment: formData.segment,
    acquisitionType: formData.acquisitionType,
    conversionStep: formData.conversionStep || 'initial',
    referredBy: formData.referredBy || null,
    priorityScore: formData.priorityScore,
    tags: formData.tags,
    sgkInfo: formData.sgkInfo,
    customData: formData.customData || {}
  };
}