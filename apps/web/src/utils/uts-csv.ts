import Papa from 'papaparse';
import mapCsvRowToUtsPayload from './uts-mapping';

export function parseAndMapCsv(content: string) {
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  const rows = (parsed.data as any[]).filter(Boolean);

  const mapped = rows.map((r) => ({ raw: r, mapped: mapCsvRowToUtsPayload(r) }));

  // Simple validation: require serial and partyTc
  const errors = mapped
    .map((m, idx) => {
      const e: string[] = [];
      if (!m.mapped.serial) e.push('serial_missing');
      if (!m.mapped.partyTc) e.push('party_tc_missing');
      return { row: idx, errors: e };
    })
    .filter((r) => r.errors.length > 0);

  return { rows, mapped, errors };
}

export default parseAndMapCsv;
