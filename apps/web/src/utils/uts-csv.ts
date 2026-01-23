import Papa from 'papaparse';
import mapCsvRowToUtsPayload from './uts-mapping';

export interface UtsPayload {
  serial: string;
  manufacturer: string;
  model: string;
  partyTc: string;
}

export interface UtsCsvPreview {
  rows: Record<string, string>[];
  mapped: { raw: Record<string, string>; mapped: UtsPayload }[];
  errors: { row: number; errors: string[] }[];
}

export function parseAndMapCsv(content: string): UtsCsvPreview {
  const parsed = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter(Boolean);

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
