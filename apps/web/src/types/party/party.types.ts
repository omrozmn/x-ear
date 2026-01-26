import { z } from 'zod';
import i18next from '../../i18n'; // Import initialized i18n instance

// Enums based on generated types
export const PartyStatusSchema = z.enum(['active', 'inactive']);
export const PartyGenderSchema = z.enum(['M', 'F']);

// Address schema
export const PartyAddressSchema = z.object({
  city: z.string().optional(),
  district: z.string().optional(),
  fullAddress: z.string().optional(),
});

// Core Party schema based on generated Orval types
export const PartySchema = z.object({
  id: z.string().optional(),
  tcNumber: z.string().min(11, i18next.t('validation.tc_length', { ns: 'validation' })).max(11, i18next.t('validation.tc_length', { ns: 'validation' })),
  tc_number: z.string().optional(),
  identityNumber: z.string().optional(),
  identity_number: z.string().optional(),
  firstName: z.string().min(1, i18next.t('validation.name_required', { ns: 'validation' })),
  first_name: z.string().optional(),
  lastName: z.string().min(1, i18next.t('validation.last_name_required', { ns: 'validation' })),
  last_name: z.string().optional(),
  phone: z.string().min(1, i18next.t('validation.phone_required', { ns: 'validation' })),
  email: z.string().email(i18next.t('validation.email_invalid', { ns: 'validation' })).optional().or(z.literal('')),
  birthDate: z.string().optional(), // ISO date string
  birth_date: z.string().optional(),
  gender: PartyGenderSchema.optional(),
  addressCity: z.string().optional(),
  address_city: z.string().optional(),
  addressDistrict: z.string().optional(),
  address_district: z.string().optional(),
  addressFull: z.string().optional(),
  address_full: z.string().optional(),
  status: PartyStatusSchema.default('active'),
  segment: z.string().optional(),
  acquisitionType: z.string().optional(),
  acquisition_type: z.string().optional(),
  conversionStep: z.string().optional(),
  conversion_step: z.string().optional(),
  referredBy: z.string().optional(),
  referred_by: z.string().optional(),
  priorityScore: z.number().default(0),
  priority_score: z.number().optional(),
  tags: z.array(z.string()).default([]),
  hearingProfile: z.record(z.unknown()).optional(),
  hearing_profile: z.record(z.unknown()).optional(),
  roles: z.array(z.object({
    role_code: z.string(),
    is_primary: z.boolean().optional()
  })).optional(),
  sgkInfo: z.record(z.unknown()).optional(),
  sgk_info: z.record(z.unknown()).optional(),
  customData: z.record(z.unknown()).optional(),
  custom_data: z.record(z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Create schema for API calls
export const CreatePartySchema = z.object({
  tcNumber: z.string().min(11, i18next.t('validation.tc_length', { ns: 'validation' })).max(11, i18next.t('validation.tc_length', { ns: 'validation' })),
  firstName: z.string().min(1, i18next.t('validation.name_required', { ns: 'validation' })),
  lastName: z.string().min(1, i18next.t('validation.last_name_required', { ns: 'validation' })),
  phone: z.string().min(1, i18next.t('validation.phone_required', { ns: 'validation' })),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional(),
  gender: PartyGenderSchema.optional(),
  addressCity: z.string().optional(),
  addressDistrict: z.string().optional(),
  addressFull: z.string().optional(),
  status: PartyStatusSchema.default('active'),
  segment: z.string().optional(),
  acquisitionType: z.string().optional(),
  conversionStep: z.string().optional(),
  referredBy: z.string().optional(),
  priorityScore: z.number().default(0),
  tags: z.array(z.string()).default([]),
  hearingProfile: z.record(z.unknown()).optional(),
  roles: z.array(z.object({
    role_code: z.string(),
    is_primary: z.boolean().optional()
  })).optional(),
  sgkInfo: z.record(z.unknown()).optional(),
  customData: z.record(z.unknown()).optional(),
});

// Update schema
export const UpdatePartySchema = CreatePartySchema.partial();

// Search filters schema
export const PartiesFiltersSchema = z.object({
  search: z.string().optional(),
  status: PartyStatusSchema.optional(),
  segment: z.string().optional(),
  acquisitionType: z.string().optional(),
  tcNumber: z.string().optional(),
  phone: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().default(1),
  per_page: z.number().default(50),
  sortBy: z.enum(['firstName', 'lastName', 'createdAt', 'priorityScore']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Type exports
export type PartyStatus = z.infer<typeof PartyStatusSchema>;
export type PartyGender = z.infer<typeof PartyGenderSchema>;
export type PartyAddress = z.infer<typeof PartyAddressSchema>;
export type Party = z.infer<typeof PartySchema>;
export type CreatePartyBody = z.infer<typeof CreatePartySchema>;
export type UpdatePartyBody = z.infer<typeof UpdatePartySchema>;
export type PartiesFilters = z.infer<typeof PartiesFiltersSchema>;

// Form validation helpers
export const validateTCNumber = (tcNumber: string): boolean => {
  if (!tcNumber || tcNumber.length !== 11) return false;

  const digits = tcNumber.split('').map(Number);
  if (digits.some(isNaN)) return false;

  // TC Number validation algorithm
  const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
  const check1 = (sum1 * 7 - sum2) % 10;
  const check2 = (sum1 + sum2 + digits[9]) % 10;

  return check1 === digits[9] && check2 === digits[10];
};

export const validatePhone = (phone: string): boolean => {
  // Turkish phone number validation (basic)
  const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};