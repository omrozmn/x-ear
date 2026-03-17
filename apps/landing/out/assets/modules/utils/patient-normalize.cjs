function canonicalizePatient(raw) {
  if (!raw) return null;
  const patient = Object.assign({}, raw);
  patient.identityNumber = raw.identityNumber || raw.identity_number || raw.tcNumber || raw.tc || null;
  if (raw.dob && raw.dob.indexOf('T') !== -1) {
    patient.dob = raw.dob.split('T')[0];
  }
  if ((!raw.firstName || !raw.lastName) && raw.fullName) {
    const parts = raw.fullName.split(' ');
    patient.firstName = patient.firstName || parts[0];
    patient.lastName = patient.lastName || parts.slice(1).join(' ');
  }
  patient.createdAt = raw.createdAt || raw.created_at || null;
  patient.name = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  patient.tcNumber = patient.tcNumber || patient.tc || patient.identityNumber || null;
  return patient;
}

if (typeof window !== 'undefined') {
  window.CanonicalizePatient = { canonicalizePatient };
}

module.exports = { canonicalizePatient };
