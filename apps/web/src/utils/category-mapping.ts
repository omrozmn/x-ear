/**
 * Category mapping between backend values and display labels
 */

export const CATEGORY_MAPPING: Record<string, string> = {
  'hearing_aid': 'İşitme Cihazı',
  'battery': 'Pil',
  'accessory': 'Aksesuar',
  'maintenance': 'Bakım Ürünleri',
  'ear_mold': 'Kulak Kalıbı',
  'cleaning_supplies': 'Temizlik Ürünleri',
  'amplifiers': 'Amplifikatör'
};

export const REVERSE_CATEGORY_MAPPING: Record<string, string> = {
  'İşitme Cihazı': 'hearing_aid',
  'Pil': 'battery',
  'Aksesuar': 'accessory',
  'Bakım Ürünleri': 'maintenance',
  'Kulak Kalıbı': 'ear_mold',
  'Temizlik Ürünleri': 'cleaning_supplies',
  'Amplifikatör': 'amplifiers'
};

export function getCategoryDisplay(backendValue?: string): string {
  if (!backendValue) return '';
  return CATEGORY_MAPPING[backendValue] || backendValue;
}

export function getCategoryValue(displayLabel?: string): string {
  if (!displayLabel) return '';
  return REVERSE_CATEGORY_MAPPING[displayLabel] || displayLabel;
}
