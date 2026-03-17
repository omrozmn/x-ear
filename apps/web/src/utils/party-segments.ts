// Party segments and acquisition types utility functions
import { customInstance } from '@/api/orval-mutator';

export interface SegmentOption {
  value: string;
  label: string;
  count?: number;
}

export interface AcquisitionOption {
  value: string;
  label: string;
  count?: number;
}

const STORAGE_KEY_SEGMENTS = 'custom_party_segments';
const STORAGE_KEY_ACQUISITIONS = 'custom_acquisition_types';

// Default segments (fallback if localStorage is empty)
const DEFAULT_SEGMENTS: SegmentOption[] = [
  { value: 'new', label: 'Yeni' },
  { value: 'lead', label: 'Potansiyel Müşteri' },
  { value: 'trial', label: 'Deneme Aşamasında' },
  { value: 'customer', label: 'Müşteri' },
  { value: 'control', label: 'Kontrol Hastası' },
  { value: 'renewal', label: 'Yenileme' },
  { value: 'existing', label: 'Mevcut Hasta' },
  { value: 'vip', label: 'VIP' },
];

// Default acquisitions (fallback if localStorage is empty)
const DEFAULT_ACQUISITIONS: AcquisitionOption[] = [
  { value: 'referral', label: 'Referans' },
  { value: 'online', label: 'Online' },
  { value: 'walk-in', label: 'Ziyaret' },
  { value: 'social-media', label: 'Sosyal Medya' },
  { value: 'advertisement', label: 'Reklam' },
  { value: 'tabela', label: 'Tabela' },
  { value: 'other', label: 'Diğer' },
];

/**
 * Load segments and acquisitions from API, fallback to localStorage, then defaults
 */
export const loadPartySegmentsFromAPI = async (): Promise<{ segments: SegmentOption[], acquisitions: AcquisitionOption[] }> => {
  try {
    const response = await customInstance<{ data: { segments: SegmentOption[], acquisitionTypes: AcquisitionOption[] } }>({
      url: '/api/settings/party-segments',
      method: 'GET',
    });

    const data = response.data;
    if (data) {
      const segments = data.segments || DEFAULT_SEGMENTS;
      const acquisitions = data.acquisitionTypes || DEFAULT_ACQUISITIONS;
      
      // Update localStorage cache
      localStorage.setItem(STORAGE_KEY_SEGMENTS, JSON.stringify(segments));
      localStorage.setItem(STORAGE_KEY_ACQUISITIONS, JSON.stringify(acquisitions));
      
      return { segments, acquisitions };
    }
  } catch (error) {
    console.error('Failed to load party segments from API:', error);
  }

  // Fallback to localStorage
  try {
    const savedSegments = localStorage.getItem(STORAGE_KEY_SEGMENTS);
    const savedAcquisitions = localStorage.getItem(STORAGE_KEY_ACQUISITIONS);
    
    if (savedSegments && savedAcquisitions) {
      return {
        segments: JSON.parse(savedSegments),
        acquisitions: JSON.parse(savedAcquisitions)
      };
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
  }

  // Final fallback to defaults
  return {
    segments: DEFAULT_SEGMENTS,
    acquisitions: DEFAULT_ACQUISITIONS
  };
};

/**
 * Get party segments from localStorage or return defaults
 */
export const getPartySegments = (): SegmentOption[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SEGMENTS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading party segments:', error);
  }
  return DEFAULT_SEGMENTS;
};

/**
 * Get acquisition types from localStorage or return defaults
 */
export const getAcquisitionTypes = (): AcquisitionOption[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACQUISITIONS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading acquisition types:', error);
  }
  return DEFAULT_ACQUISITIONS;
};

/**
 * Get segment label by value
 */
export const getSegmentLabel = (value: string): string => {
  const segments = getPartySegments();
  const segment = segments.find(s => s.value === value);
  return segment?.label || value;
};

/**
 * Get acquisition type label by value
 */
export const getAcquisitionLabel = (value: string): string => {
  const acquisitions = getAcquisitionTypes();
  const acquisition = acquisitions.find(a => a.value === value);
  return acquisition?.label || value;
};