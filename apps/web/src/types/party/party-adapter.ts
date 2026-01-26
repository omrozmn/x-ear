/**
 * Party Adapter Types
 * @fileoverview Adapter types for converting between different party data formats
 * @version 1.0.0
 */

import type { Party, PartyDevice, PartyNote, PartyCommunication } from './party-base.types';
import type { PartyRead } from '@/api/generated/schemas';

// Adapter interface for converting between API and UI formats
export interface PartyAdapter {
  fromApi: (apiData: Record<string, unknown>) => Party;
  toApi: (party: Party) => Record<string, unknown>;
  fromForm: (formData: Record<string, unknown>) => Party;
  toForm: (party: Party) => Record<string, unknown>;
}

// Legacy conversion function for backward compatibility
export const convertOrvalToLegacyParty = (orvalParty: PartyRead | Record<string, unknown>): Party => {
  const asRecord = orvalParty as Record<string, unknown>;
  
  // Create a clean Party object without spreading to avoid null issues
  const party: Party = {
    id: (orvalParty.id ?? '') as string,
    tcNumber: (orvalParty.tcNumber ?? asRecord.identityNumber ?? asRecord.identity_number ?? undefined) as string | undefined,
    identityNumber: (orvalParty.identityNumber ?? asRecord.identity_number ?? undefined) as string | undefined,
    firstName: (orvalParty.firstName ?? asRecord.first_name ?? '') as string,
    lastName: (orvalParty.lastName ?? asRecord.last_name ?? '') as string,
    phone: (orvalParty.phone ?? undefined) as string | undefined,
    email: (orvalParty.email ?? undefined) as string | undefined,
    birthDate: (orvalParty.birthDate ?? asRecord.birth_date ?? undefined) as string | undefined,
    gender: (orvalParty.gender ?? undefined) as string | undefined,
    status: (orvalParty.status ?? 'active') as string,
    segment: (orvalParty.segment ?? undefined) as string | undefined,
    createdAt: (orvalParty.createdAt ?? asRecord.created_at ?? '') as string,
    updatedAt: (orvalParty.updatedAt ?? asRecord.updated_at ?? '') as string,
    devices: (asRecord.devices ?? []) as PartyDevice[],
    notes: (asRecord.notes ?? []) as PartyNote[],
    communications: (asRecord.communications ?? []) as PartyCommunication[],
  };
  
  return party;
};

// Create party request function
export const createPartyRequest = (party: Party): Record<string, unknown> => {
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
  fromApi: (apiData: Record<string, unknown>): Party => {
    return {
      id: apiData.id as string,
      tcNumber: (apiData.tc_number || apiData.tcNumber) as string | undefined,
      firstName: (apiData.first_name || apiData.firstName) as string,
      lastName: (apiData.last_name || apiData.lastName) as string,
      phone: apiData.phone as string | undefined,
      email: apiData.email as string | undefined,
      birthDate: (apiData.birth_date || apiData.birthDate) as string | undefined,
      gender: apiData.gender as string | undefined,
      addressCity: (apiData.address_city || apiData.addressCity) as string | undefined,
      addressDistrict: (apiData.address_district || apiData.addressDistrict) as string | undefined,
      addressFull: (apiData.address_full || apiData.addressFull) as string | undefined,
      status: apiData.status as string,
      segment: apiData.segment as string | undefined,
      acquisitionType: (apiData.acquisition_type || apiData.acquisitionType) as string | undefined,
      conversionStep: (apiData.conversion_step || apiData.conversionStep) as string | undefined,
      referredBy: (apiData.referred_by || apiData.referredBy) as string | undefined,
      priorityScore: (apiData.priority_score || apiData.priorityScore || 0) as number,
      tags: (apiData.tags || []) as string[],
      sgkInfo: (apiData.sgk_info || apiData.sgkInfo) as Record<string, unknown> | undefined,
      customData: (apiData.custom_data || apiData.customData) as Record<string, unknown> | undefined,
      createdAt: (apiData.created_at || apiData.createdAt) as string,
      updatedAt: (apiData.updated_at || apiData.updatedAt) as string,
    };
  },

  toApi: (party: Party): Record<string, unknown> => {
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

  fromForm: (formData: Record<string, unknown>): Party => {
    return {
      id: formData.id as string,
      tcNumber: formData.tcNumber as string | undefined,
      firstName: formData.firstName as string,
      lastName: formData.lastName as string,
      phone: formData.phone as string | undefined,
      email: formData.email as string | undefined,
      birthDate: formData.birthDate as string | undefined,
      gender: formData.gender as string | undefined,
      addressCity: formData.addressCity as string | undefined,
      addressDistrict: formData.addressDistrict as string | undefined,
      addressFull: formData.addressFull as string | undefined,
      status: (formData.status || 'active') as string,
      segment: formData.segment as string | undefined,
      acquisitionType: formData.acquisitionType as string | undefined,
      conversionStep: formData.conversionStep as string | undefined,
      referredBy: formData.referredBy as string | undefined,
      priorityScore: (formData.priorityScore || 0) as number,
      tags: (formData.tags || []) as string[],
      sgkInfo: formData.sgkInfo as Record<string, unknown> | undefined,
      customData: formData.customData as Record<string, unknown> | undefined,
      createdAt: formData.createdAt as string,
      updatedAt: formData.updatedAt as string,
    };
  },

  toForm: (party: Party): Record<string, unknown> => {
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