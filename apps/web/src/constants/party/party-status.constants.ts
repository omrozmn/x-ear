/**
 * Party Status Constants
 * @fileoverview Status definitions and related constants
 * @version 1.0.0
 */

import { PartyStatus } from '@/api/generated/schemas';
import type {
  PartySegment,
  PartyLabel
} from '../../types/party/party-base.types';

// Map backend PartyStatus values to Turkish labels
export const PARTY_STATUS: Record<PartyStatus, string> = {
  active: 'Aktif',
  inactive: 'Pasif',
  lead: 'Potansiyel',
  trial: 'Deneme',
  customer: 'Müşteri',
  new: 'Yeni',
  deceased: 'Vefat',
  archived: 'Arşivlenmiş'
} as const;

export const PARTY_SEGMENT: Record<PartySegment, string> = {
  NEW: 'Yeni',
  TRIAL: 'Deneme',
  PURCHASED: 'Satın Alındı',
  CONTROL: 'Kontrol',
  RENEWAL: 'Yenileme',
  EXISTING: 'Mevcut',
  VIP: 'VIP'
} as const;

export const PARTY_LABEL: Record<PartyLabel, string> = {
  'yeni': 'Yeni',
  'arama-bekliyor': 'Arama Bekliyor',
  'randevu-verildi': 'Randevu Verildi',
  'deneme-yapildi': 'Deneme Yapıldı',
  'kontrol-hastasi': 'Kontrol Hastası',
  'satis-tamamlandi': 'Satış Tamamlandı'
} as const;

export const STATUS_COLORS: Record<PartyStatus, string> = {
  active: '#10B981',
  inactive: '#6B7280',
  lead: '#8B5CF6',
  trial: '#F59E0B',
  customer: '#06B6D4',
  new: '#3B82F6',
  deceased: '#EF4444',
  archived: '#9CA3AF'
} as const;

export const SEGMENT_COLORS: Record<PartySegment, string> = {
  NEW: '#8B5CF6',
  TRIAL: '#F59E0B',
  PURCHASED: '#10B981',
  CONTROL: '#06B6D4',
  RENEWAL: '#EC4899',
  EXISTING: '#6B7280',
  VIP: '#FFD700'
} as const;

export const LABEL_COLORS: Record<PartyLabel, string> = {
  'yeni': '#8B5CF6',
  'arama-bekliyor': '#F59E0B',
  'randevu-verildi': '#06B6D4',
  'deneme-yapildi': '#10B981',
  'kontrol-hastasi': '#6366F1',
  'satis-tamamlandi': '#059669'
} as const;