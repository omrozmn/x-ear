export function mapCsvRowToUtsPayload(row: Record<string, string>) {
  // Minimal mapping: expect columns 'serial','manufacturer','model','patientTc'
  return {
    serial: row.serial || row.Serial || row.SERIAL || '',
    manufacturer: row.manufacturer || row.Manufacturer || row.MFG || '',
    model: row.model || row.Model || '',
    patientTc: row.patientTc || row.patient_tc || row.tc || ''
  };
}

export default mapCsvRowToUtsPayload;
