/**
 * Party Adapter Types
 * @fileoverview Adapter types for converting between different party data formats
 * @version 1.0.0
 */

import type { Party } from './party-base.types';

// Adapter interface for converting between API and UI formats
export interface PartyAdapter {
  fromApi: (apiData: any) => Party;
  toApi: (party: Party) => any;
  fromForm: (formData: any) => Party;
  toForm: (party: Party) => any;
}

// Legacy conversion function for backward compatibility
export const convertOrvalToLegacyParty = (orvalParty: any): Party => {
  return {
    ...orvalParty,
    id: orvalParty.id,
    tcNumber: orvalParty.tcNumber || orvalParty.identityNumber || orvalParty.identity_number,
    firstName: orvalParty.firstName || orvalParty.first_name,
    lastName: orvalParty.lastName || orvalParty.last_name,
    phone: orvalParty.phone,
    email: orvalParty.email,
    birthDate: orvalParty.birthDate || orvalParty.birth_date,
    gender: orvalParty.gender,
    status: orvalParty.status,
    segment: orvalParty.segment,
    createdAt: orvalParty.createdAt || orvalParty.created_at,
    updatedAt: orvalParty.updatedAt || orvalParty.updated_at,
    devices: orvalParty.devices || [],
    notes: orvalParty.notes || [],
    communications: orvalParty.communications || [],
  };
};

// Create party request function
export const createPartyRequest = (party: Party): any => {
  return {
    firstName: party.firstName || '',
    lastName: party.lastName || '',
    tcNumber: party.tcNumber || party.identityNumber || '',
    phone: party.phone,
    email: party.email,
    birthDate: party.birthDate,
    gender: party.gender,
    status: party.status,
    segment: party.segment,
    acquisitionType: party.acquisitionType,
    tags: party.tags,
  };
};

// Default party adapter implementation
export const defaultPartyAdapter: PartyAdapter = {
  fromApi: (apiData: any): Party => {
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

  toApi: (party: Party): any => {
    return {
      id: party.id,
      tc_number: party.tcNumber,
      first_name: party.firstName,
      last_name: party.lastName,
      phone: party.phone,
      email: party.email,
      birth_date: party.birthDate,
      gender: party.gender,
      address_city: party.addressCity,
      address_district: party.addressDistrict,
      address_full: party.addressFull,
      status: party.status,
      segment: party.segment,
      acquisition_type: party.acquisitionType,
      conversion_step: party.conversionStep,
      referred_by: party.referredBy,
      priority_score: party.priorityScore,
      tags: party.tags,
      sgk_info: party.sgkInfo,
      custom_data: party.customData,
      created_at: party.createdAt,
      updated_at: party.updatedAt,
    };
  },

  fromForm: (formData: any): Party => {
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

  toForm: (party: Party): any => {
    return {
      id: party.id,
      tcNumber: party.tcNumber,
      firstName: party.firstName,
      lastName: party.lastName,
      phone: party.phone,
      email: party.email,
      birthDate: party.birthDate,
      gender: party.gender,
      addressCity: party.addressCity,
      addressDistrict: party.addressDistrict,
      addressFull: party.addressFull,
      status: party.status,
      segment: party.segment,
      acquisitionType: party.acquisitionType,
      conversionStep: party.conversionStep,
      referredBy: party.referredBy,
      priorityScore: party.priorityScore,
      tags: party.tags,
      sgkInfo: party.sgkInfo,
      customData: party.customData,
      createdAt: party.createdAt,
      updatedAt: party.updatedAt,
    };
  },
};