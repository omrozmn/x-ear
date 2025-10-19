/**
 * Patient Constants Index
 * @fileoverview Central export for all patient-related constants
 * @version 1.0.0
 */

// Status Constants
export * from './patient-status.constants';

// Device Constants
export * from './patient-device.constants';

// Re-export commonly used constants
export {
  PATIENT_STATUS,
  PATIENT_SEGMENT,
  PATIENT_LABEL,
  STATUS_COLORS,
  SEGMENT_COLORS,
  LABEL_COLORS
} from './patient-status.constants';

export {
  DEVICE_TYPE,
  DEVICE_SIDE,
  DEVICE_STATUS,
  DEVICE_TYPE_COLORS,
  DEVICE_STATUS_COLORS,
  DEVICE_BRANDS,
  BATTERY_TYPES,
  SERVICE_TYPES,
  DEFAULT_DEVICE_SETTINGS
} from './patient-device.constants';