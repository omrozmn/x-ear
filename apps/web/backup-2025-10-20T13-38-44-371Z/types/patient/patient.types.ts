import { z } from 'zod';

// Enums based on generated types
export const PatientStatusSchema = z.enum(['active', 'inactive']);
export const PatientGenderSchema = z.enum(['M', 'F']);

// Address schema
export const PatientAddressSchema = z.object({
  city: z.string().optional(),
  district: z.string().optional(),
  fullAddress: z.string().optional(),
});

// Core Patient schema based on generated Orval types
export const PatientSchema = z.object({
  id: z.string().optional(),
  tcNumber: z.string().min(11, 'TC Number must be 11 digits').max(11, 'TC Number must be 11 digits'),
  tc_number: z.string().optional(),
  identityNumber: z.string().optional(),
  identity_number: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  first_name: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  last_name: z.string().optional(),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional(), // ISO date string
  birth_date: z.string().optional(),
  gender: PatientGenderSchema.optional(),
  addressCity: z.string().optional(),
  address_city: z.string().optional(),
  addressDistrict: z.string().optional(),
  address_district: z.string().optional(),
  addressFull: z.string().optional(),
  address_full: z.string().optional(),
  status: PatientStatusSchema.default('active'),
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
  sgkInfo: z.record(z.unknown()).optional(),
  sgk_info: z.record(z.unknown()).optional(),
  customData: z.record(z.unknown()).optional(),
  custom_data: z.record(z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Create schema for API calls
export const CreatePatientSchema = z.object({
  tcNumber: z.string().min(11, 'TC Number must be 11 digits').max(11, 'TC Number must be 11 digits'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional(),
  gender: PatientGenderSchema.optional(),
  addressCity: z.string().optional(),
  addressDistrict: z.string().optional(),
  addressFull: z.string().optional(),
  status: PatientStatusSchema.default('active'),
  segment: z.string().optional(),
  acquisitionType: z.string().optional(),
  conversionStep: z.string().optional(),
  referredBy: z.string().optional(),
  priorityScore: z.number().default(0),
  tags: z.array(z.string()).default([]),
  sgkInfo: z.record(z.unknown()).optional(),
  customData: z.record(z.unknown()).optional(),
});

// Update schema
export const UpdatePatientSchema = CreatePatientSchema.partial();

// Search filters schema
export const PatientsFiltersSchema = z.object({
  search: z.string().optional(),
  status: PatientStatusSchema.optional(),
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
export type PatientStatus = z.infer<typeof PatientStatusSchema>;
export type PatientGender = z.infer<typeof PatientGenderSchema>;
export type PatientAddress = z.infer<typeof PatientAddressSchema>;
export type Patient = z.infer<typeof PatientSchema>;
export type CreatePatientBody = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientBody = z.infer<typeof UpdatePatientSchema>;
export type PatientsFilters = z.infer<typeof PatientsFiltersSchema>;

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