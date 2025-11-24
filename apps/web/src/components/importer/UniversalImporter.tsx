import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Modal, Button, Input, Select, Alert } from '@x-ear/ui-web';
import { z } from 'zod';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5003' });

export type FieldDef = { key: string; label: string };

interface UniversalImporterProps {
  isOpen: boolean;
  onClose: () => void;
  entityFields: FieldDef[]; // the application's canonical fields to map to
  zodSchema?: z.ZodTypeAny; // optional Zod schema for per-row validation
  uploadEndpoint?: string; // endpoint to POST the file to
  modalTitle?: string;
  sampleDownloadUrl?: string;
  onComplete?: (result: { created: number; updated: number; errors: any[] }) => void;
  previewRows?: number;
}

const defaultSchema = z.record(z.any());

const readFile = async (file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: true });
    const headers = parsed.meta.fields || [];
    return { headers, rows: parsed.data };
  }

  // Try XLSX
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<any>(ws, { header: 1, raw: false });
  if (!aoa || aoa.length === 0) return { headers: [], rows: [] };
  const headers = (aoa[0] as any[]).map(h => String(h || '').trim());
  const rows: Record<string, any>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const rowArr = aoa[i] as any[];
    const obj: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rowArr[j];
    }
    // skip empty rows
    if (Object.values(obj).some(v => v !== null && v !== undefined && String(v).trim() !== '')) {
      rows.push(obj);
    }
  }
  return { headers, rows };
};

const sanitizeCell = (val: any) => {
  if (typeof val !== 'string') return val;
  // Prevent CSV injection
  if (/^[=+\-@]/.test(val)) return `'${val}`;
  return val;
};

const UniversalImporter: React.FC<UniversalImporterProps> = ({
  isOpen,
  onClose,
  entityFields,
  zodSchema,
  uploadEndpoint,
  onComplete,
  previewRows = 5
  ,
  modalTitle,
  sampleDownloadUrl,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; issues: string[] }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: any[] } | null>(null);
  const schema = zodSchema || defaultSchema;

  useEffect(() => {
    if (!file) {
      setFileHeaders([]);
      setFileRows([]);
      setMapping({});
      setPreview([]);
      setErrors([]);
      return;
    }

    (async () => {
      try {
        const { headers, rows } = await readFile(file);
        setFileHeaders(headers);
        setFileRows(rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, sanitizeCell(v)]))));
        // initialize mapping heuristically
        const initial: Record<string, string> = {};
        const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileNorm = headers.map(h => ({ h, n: normalized(h) }));
        entityFields.forEach(f => {
          // try exact or fuzzy match
          const keyNorm = normalized(f.label || f.key || '');
          const found = fileNorm.find(x => x.n === keyNorm) || fileNorm.find(x => x.n.includes(keyNorm)) || fileNorm.find(x => keyNorm.includes(x.n));
          initial[f.key] = found ? found.h : '';
        });
        setMapping(initial);
        setPreview(rows.slice(0, previewRows).map(r => sanitizeRowForPreview(r)));
        // move to mapping step automatically when a file is chosen
        setStep(2);
      } catch (err) {
        console.error('Failed to parse file', err);
      }
    })();
  }, [file]);

  const sanitizeRowForPreview = (row: Record<string, any>) => {
    const sanitized: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => sanitized[k] = sanitizeCell(v));
    return sanitized;
  };

  const buildMappedRows = () => {
    return fileRows.map((r, idx) => {
      const out: Record<string, any> = {};
      entityFields.forEach(f => {
        const fileKey = mapping[f.key];
        out[f.key] = fileKey ? r[fileKey] : undefined;
      });
      return out;
    });
  };

  const validatePreview = () => {
    const rows = buildMappedRows();
    const errs: Array<{ row: number; issues: string[] }> = [];
    for (let i = 0; i < Math.min(rows.length, previewRows); i++) {
      try {
        schema.parse(rows[i]);
      } catch (e: any) {
        const issues = e.errors ? e.errors.map((it: any) => `${it.path.join('.')}: ${it.message}`) : [String(e)];
        errs.push({ row: i + 1, issues });
      }
    }
    setErrors(errs);
    setPreview(rows.slice(0, previewRows));
  };

  useEffect(() => {
    if (fileRows.length > 0) validatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapping, fileRows]);

  const handleImport = async () => {
    setIsProcessing(true);
    try {
      const rows = buildMappedRows();
      // client-side validate all rows and collect errors
      const allErrors: Array<{ row: number; issues: string[] }> = [];
      const validRows: Record<string, any>[] = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          const parsed = schema.parse(rows[i]);
          validRows.push(parsed);
        } catch (e: any) {
          const issues = e.errors ? e.errors.map((it: any) => `${it.path.join('.')}: ${it.message}`) : [String(e)];
          allErrors.push({ row: i + 1, issues });
        }
      }

      // If there are validation errors, surface them but allow user to continue
      if (allErrors.length > 0) {
        setErrors(allErrors.slice(0, 50));
        // still proceed to send validRows if any
      }

      // Upload valid rows to backend as a CSV file using the patients bulk endpoint
      let created = 0, updated = 0;
      try {
        if (validRows.length > 0) {
          const csv = Papa.unparse(validRows);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const form = new FormData();
          // Backend expects field name 'file'
          form.append('file', blob, 'import.csv');

          const endpoint = (uploadEndpoint && uploadEndpoint.length > 0) ? uploadEndpoint : '/api/patients/bulk_upload';
          const resp = await api.post(endpoint, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (resp?.data) {
            created = resp.data.created || 0;
            updated = resp.data.updated || 0;
            // Merge server-side reported errors (if any) with client-side validation errors
            const serverErrors = resp.data.errors || [];
            if (serverErrors.length > 0) {
              // normalize to same shape as client errors
              const sErrors = serverErrors.map((it: any) => ({ row: it.row || it.index || 0, issues: [it.error || JSON.stringify(it)] }));
              allErrors.push(...sErrors);
              setErrors(allErrors.slice(0, 200));
            }
          }
        }

        const result = { created, updated, errors: allErrors };
        setImportResult(result);
        onComplete?.(result);
      } catch (uploadErr) {
        console.error('Upload failed', uploadErr);
        // Surface a generic error to the user via errors state
        setErrors(prev => [...prev, { row: 0, issues: [String(uploadErr)] }]);
        const result = { created, updated, errors: allErrors };
        setImportResult(result);
        onComplete?.(result);
      }
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setFileHeaders([]);
    setFileRows([]);
    setMapping({});
    setPreview([]);
    setErrors([]);
    setImportResult(null);
    setStep(1);
  };

  const renderMappingControls = () => (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">Başlık eşleştirmesi: CSV/XLS sütunlarını uygulama alanlarına eşleyin.</div>
      <div className="grid grid-cols-1 gap-2">
        {entityFields.map(f => (
          <div key={f.key} className="flex items-center space-x-2">
            <div className="w-40 text-sm text-gray-700">{f.label}</div>
            <Select
              value={mapping[f.key] || ''}
              onChange={(e) => setMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
              options={[{ label: '(eşleştirilmedi)', value: '' }, ...fileHeaders.map(h => ({ label: h, value: h }))]}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={() => { resetAll(); onClose(); }} title={modalTitle || 'Dosyadan İçeri Aktar'} size="lg">
      <div className="space-y-4">
        {sampleDownloadUrl && (
          <div className="flex justify-end">
            <a href={sampleDownloadUrl} download className="text-sm text-gray-600">Örnek dosya indir</a>
          </div>
        )}

        {/* Stepper */}
        <div className="flex items-center space-x-4 mb-2">
          {['Dosya Seç', 'Başlık Eşleştir', 'Önizleme', 'Yükle / Sonuçlar'].map((label, idx) => {
            const s = idx + 1;
            return (
              <div key={s} className={`flex items-center space-x-2 ${step === s ? 'text-blue-600' : step > s ? 'text-green-600' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === s ? 'bg-blue-100' : step > s ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <span className="text-sm font-medium">{s}</span>
                </div>
                <div className="text-sm font-medium">{label}</div>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        {step === 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dosya Seç (.csv, .xlsx)</label>
            <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div className="text-sm text-gray-600 mt-2">{file ? `Seçili dosya: ${file.name} — ${fileRows.length} satır bulundu` : 'Lütfen bir CSV veya XLSX dosyası seçin'}</div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h4 className="font-medium mb-2">Başlık Eşleştirmesi</h4>
            {renderMappingControls()}
          </div>
        )}

        {step === 3 && (
          <div>
            <h4 className="font-medium">Önizleme (ilk {previewRows} satır)</h4>
            <div className="overflow-auto border rounded mt-2">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {entityFields.map(f => <th key={f.key} className="px-2 py-1 text-left font-medium">{f.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, idx) => (
                    <tr key={idx} className="border-t">
                      {entityFields.map(f => (
                        <td key={f.key} className="px-2 py-1">{String(r[f.key] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errors.length > 0 && (
              <div className="mt-3">
                <Alert variant="warning">Bazı satırlarda doğrulama hataları var. Önizleme ve eşleştirmeyi kontrol edin.</Alert>
                <div className="mt-2 max-h-48 overflow-auto text-sm border rounded p-2">
                  {errors.slice(0, 50).map((e, i) => (
                    <div key={i} className="mb-2">
                      <strong>Satır {e.row}:</strong>
                      <ul className="list-disc ml-5">
                        {e.issues.map((it, j) => <li key={j}>{it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h4 className="font-medium">Yükleme ve Sonuçlar</h4>
            {importResult ? (
              <div className="mt-3">
                <div className="text-sm">Oluşturulan: <strong>{importResult.created}</strong></div>
                <div className="text-sm">Güncellenen: <strong>{importResult.updated}</strong></div>
                <div className="text-sm">Hatalı satır sayısı: <strong>{importResult.errors?.length || 0}</strong></div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-auto text-sm border rounded p-2">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="mb-2">Satır {err.row || i + 1}: {err.error || JSON.stringify(err)}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-700">Hazırsanız verileri sunucuya yükleyin. Geçerli satırlar gönderilecek ve sonuç burada listelenecek.</div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={() => { resetAll(); onClose(); }}>İptal</Button>
          {step > 1 && step < 4 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>Geri</Button>
          )}
          {step < 3 && (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !file}>İleri</Button>
          )}
          {step === 3 && (
            <Button onClick={() => { validatePreview(); setStep(4); }}>Önizlemeyi Doğrula</Button>
          )}
          {step === 4 && !importResult && (
            <Button onClick={handleImport} loading={isProcessing} disabled={fileRows.length === 0}>İçe Aktar</Button>
          )}
          {importResult && (
            <Button onClick={() => { resetAll(); onClose(); }}>Kapat</Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default UniversalImporter;
