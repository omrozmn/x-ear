export function mapCsvRowToUtsPayload(row: Record<string, string>) {
  // Minimal mapping: expect columns 'serial','manufacturer','model','partyTc'
  return {
    serial: row.serial || row.Serial || row.SERIAL || '',
    manufacturer: row.manufacturer || row.Manufacturer || row.MFG || '',
    model: row.model || row.Model || '',
    partyTc: row.partyTc || row.party_tc || row.tc || ''
  };
}

export default mapCsvRowToUtsPayload;
