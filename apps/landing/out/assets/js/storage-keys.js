// Legacy runtime registry for storage keys so legacy JS can access the canonical keys
window.STORAGE_KEYS = window.STORAGE_KEYS || {
  PATIENTS: 'xear_patients',
  PATIENTS_DATA: 'xear_patients_data',
  CRM_PATIENTS: window.STORAGE_KEYS?.CRM_PATIENTS || 'xear_crm_patients'
};
