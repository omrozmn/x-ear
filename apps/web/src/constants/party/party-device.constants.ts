/**
 * Party Device Constants
 * @fileoverview Device types, statuses and related constants
 * @version 1.0.0
 */

import type { 
  DeviceType, 
  DeviceSide, 
  DeviceStatus 
} from '../../types/party/party-base.types';

export const DEVICE_TYPE: Record<DeviceType, string> = {
  hearing_aid: 'İşitme Cihazı',
  cochlear_implant: 'Koklear İmplant',
  bone_anchored: 'Kemik Ankrajlı'
} as const;

export const DEVICE_SIDE: Record<DeviceSide, string> = {
  left: 'Sol',
  right: 'Sağ',
  both: 'Her İki Kulak'
} as const;

export const DEVICE_STATUS: Record<DeviceStatus, string> = {
  active: 'Aktif',
  trial: 'Deneme',
  returned: 'İade Edildi',
  replaced: 'Değiştirildi',
  assigned: 'Atanmış'
} as const;

export const DEVICE_TYPE_COLORS: Record<DeviceType, string> = {
  hearing_aid: '#10B981',
  cochlear_implant: '#3B82F6',
  bone_anchored: '#F59E0B'
} as const;

export const DEVICE_STATUS_COLORS: Record<DeviceStatus, string> = {
  active: '#10B981',
  trial: '#F59E0B',
  returned: '#6B7280',
  replaced: '#8B5CF6',
  assigned: '#3B82F6'
} as const;

// Popular Device Brands
export const DEVICE_BRANDS = [
  'Phonak',
  'Oticon',
  'Widex',
  'ReSound',
  'Signia',
  'Starkey',
  'Unitron',
  'Bernafon'
] as const;

// Battery Types
export const BATTERY_TYPES = [
  '10 (Sarı)',
  '13 (Turuncu)',
  '312 (Kahverengi)',
  '675 (Mavi)',
  'Şarjlı'
] as const;

// Service Types
export const SERVICE_TYPES = [
  'Bakım',
  'Onarım',
  'Kalibrasyon',
  'Pil Değişimi',
  'Temizlik',
  'Ayarlama',
  'Garanti Servisi'
] as const;

// Default Device Settings
export const DEFAULT_DEVICE_SETTINGS = {
  volume: 50,
  program: 'Genel',
  noiseReduction: true,
  feedbackCancellation: true,
  directionalMicrophone: false
} as const;