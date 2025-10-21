/**
 * Patient Adapter Types
 * @fileoverview Adapter types for converting between different patient data formats
 * @version 1.0.0
 */

import type { Patient } from './patient-base.types';

// Adapter interface for converting between API and UI formats
export interface PatientAdapter {
  fromApi: (apiData: any) => Patient;
  toApi: (patient: Patient) => any;
  fromForm: (formData: any) => Patient;
  toForm: (patient: Patient) => any;
}

// Legacy conversion function for backward compatibility
export const convertOrvalToLegacyPatient = (orvalPatient: any): Patient => {
  return {
    id: orvalPatient.id,
    tcNumber: orvalPatient.identityNumber || orvalPatient.identity_number || orvalPatient.tcNumber,
    firstName: orvalPatient.firstName || orvalPatient.first_name,
    lastName: orvalPatient.lastName || orvalPatient.last_name,
    phone: orvalPatient.phone,
    email: orvalPatient.email,
    birthDate: orvalPatient.birthDate || orvalPatient.birth_date,
    gender: orvalPatient.gender,
    addressCity: orvalPatient.addressCity || orvalPatient.address_city,
    addressDistrict: orvalPatient.addressDistrict || orvalPatient.address_district,
    addressFull: orvalPatient.addressFull || orvalPatient.address_full,
    status: orvalPatient.status,
    segment: orvalPatient.segment,
    acquisitionType: orvalPatient.acquisitionType || orvalPatient.acquisition_type,
    conversionStep: orvalPatient.conversionStep || orvalPatient.conversion_step,
    referredBy: orvalPatient.referredBy || orvalPatient.referred_by,
    priorityScore: orvalPatient.priorityScore || orvalPatient.priority_score || 0,
    tags: orvalPatient.tags || [],
    sgkInfo: orvalPatient.sgkInfo || orvalPatient.sgk_info,
    customData: orvalPatient.customData || orvalPatient.custom_data,
    createdAt: orvalPatient.createdAt || orvalPatient.created_at,
    updatedAt: orvalPatient.updatedAt || orvalPatient.updated_at,
    devices: orvalPatient.devices || [],
    notes: orvalPatient.notes || [],
    communications: orvalPatient.communications || [],
  };
};

// Create patient request function
export const createPatientRequest = (patient: Patient): any => {
  return {
    firstName: patient.firstName || '',
    lastName: patient.lastName || '',
    identityNumber: patient.tcNumber || '',
    phone: patient.phone,
    email: patient.email,
    birthDate: patient.birthDate,
    gender: patient.gender,
    addressCity: patient.addressCity,
    addressDistrict: patient.addressDistrict,
    addressFull: patient.addressFull,
    status: patient.status,
    segment: patient.segment,
    acquisitionType: patient.acquisitionType,
    conversionStep: patient.conversionStep,
    referredBy: patient.referredBy,
    priorityScore: patient.priorityScore,
    tags: patient.tags,
  };
};

// Default patient adapter implementation
export const defaultPatientAdapter: PatientAdapter = {
  fromApi: (apiData: any): Patient => {
    return {
      id: apiData.id,
      tcNumber: apiData.tc_number || apiData.tcNumber,
      firstName: apiData.first_name || apiData.firstName,
      lastName: apiData.last_name || apiData.lastName,
      phone: apiData.phone,
      email: apiData.email,
      birthDate: apiData.birth_date || apiData.birthDate,
      gender: apiData.gender,
      addressCity: apiData.address_city || apiData.addressCity,
      addressDistrict: apiData.address_district || apiData.addressDistrict,
      addressFull: apiData.address_full || apiData.addressFull,
      status: apiData.status,
      segment: apiData.segment,
      acquisitionType: apiData.acquisition_type || apiData.acquisitionType,
      conversionStep: apiData.conversion_step || apiData.conversionStep,
      referredBy: apiData.referred_by || apiData.referredBy,
      priorityScore: apiData.priority_score || apiData.priorityScore || 0,
      tags: apiData.tags || [],
      sgkInfo: apiData.sgk_info || apiData.sgkInfo,
      customData: apiData.custom_data || apiData.customData,
      createdAt: apiData.created_at || apiData.createdAt,
      updatedAt: apiData.updated_at || apiData.updatedAt,
    };
  },

  toApi: (patient: Patient): any => {
    return {
      id: patient.id,
      tc_number: patient.tcNumber,
      first_name: patient.firstName,
      last_name: patient.lastName,
      phone: patient.phone,
      email: patient.email,
      birth_date: patient.birthDate,
      gender: patient.gender,
      address_city: patient.addressCity,
      address_district: patient.addressDistrict,
      address_full: patient.addressFull,
      status: patient.status,
      segment: patient.segment,
      acquisition_type: patient.acquisitionType,
      conversion_step: patient.conversionStep,
      referred_by: patient.referredBy,
      priority_score: patient.priorityScore,
      tags: patient.tags,
      sgk_info: patient.sgkInfo,
      custom_data: patient.customData,
      created_at: patient.createdAt,
      updated_at: patient.updatedAt,
    };
  },

  fromForm: (formData: any): Patient => {
    return {
      id: formData.id,
      tcNumber: formData.tcNumber,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email,
      birthDate: formData.birthDate,
      gender: formData.gender,
      addressCity: formData.addressCity,
      addressDistrict: formData.addressDistrict,
      addressFull: formData.addressFull,
      status: formData.status || 'active',
      segment: formData.segment,
      acquisitionType: formData.acquisitionType,
      conversionStep: formData.conversionStep,
      referredBy: formData.referredBy,
      priorityScore: formData.priorityScore || 0,
      tags: formData.tags || [],
      sgkInfo: formData.sgkInfo,
      customData: formData.customData,
      createdAt: formData.createdAt,
      updatedAt: formData.updatedAt,
    };
  },

  toForm: (patient: Patient): any => {
    return {
      id: patient.id,
      tcNumber: patient.tcNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
      birthDate: patient.birthDate,
      gender: patient.gender,
      addressCity: patient.addressCity,
      addressDistrict: patient.addressDistrict,
      addressFull: patient.addressFull,
      status: patient.status,
      segment: patient.segment,
      acquisitionType: patient.acquisitionType,
      conversionStep: patient.conversionStep,
      referredBy: patient.referredBy,
      priorityScore: patient.priorityScore,
      tags: patient.tags,
      sgkInfo: patient.sgkInfo,
      customData: patient.customData,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  },
};