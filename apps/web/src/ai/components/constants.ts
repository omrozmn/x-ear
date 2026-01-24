import type { AIStatusType } from '../utils/aiStatusHelpers';

export const STATUS_INDICATOR_SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const STATUS_INDICATOR_LABEL_SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const STATUS_INDICATOR_COLORS: Record<AIStatusType | 'unknown', string> = {
  available: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  unavailable: 'bg-rose-500',
  unknown: 'bg-gray-400',
};

export const DEFAULT_PENDING_ACTION_LABEL = 'Onay Bekliyor';

export const PENDING_BADGE_SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export const PENDING_BADGE_VARIANT_CLASSES: Record<'default' | 'warning' | 'info', string> = {
  default: 'bg-gray-100 text-gray-800 border border-gray-200',
  warning: 'bg-amber-50 text-amber-900 border border-amber-200',
  info: 'bg-blue-50 text-blue-900 border border-blue-200',
};

export const PENDING_BADGE_POSITION_CLASSES: Record<
  'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline',
  string
> = {
  'top-right': 'absolute -top-2 -right-2',
  'top-left': 'absolute -top-2 -left-2',
  'bottom-right': 'absolute -bottom-2 -right-2',
  'bottom-left': 'absolute -bottom-2 -left-2',
  inline: 'inline-flex',
};

export const DEFAULT_PHASE_A_MESSAGE =
  'AI şu an sadece öneri modunda (Phase A). Önerileri inceleyebilirsiniz; otomatik işlem yapılmayacak.';

export const PHASE_A_BANNER_STORAGE_KEY = 'ai-phase-a-banner-dismissed';
