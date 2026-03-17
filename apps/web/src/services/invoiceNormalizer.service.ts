/**
 * Invoice Normalizer Service
 * Uses customInstance (Orval mutator) — NOT raw axios.
 * Types use camelCase (hybridCamelize converts snake_case from API).
 */

import { customInstance } from '@/api/orval-mutator';

const API_BASE = '/api/invoice-normalizer';

// ── Types (camelCase — mutator auto-converts from snake_case) ──

export interface NormalizerTemplate {
  id: string;
  name: string;
  description: string;
  columnCount: number;
  mappingCount: number;
  normalizationCount: number;
  lastUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizerTemplateDetail extends NormalizerTemplate {
  columns: Array<{
    name: string;
    type: string;
    required: boolean;
    formatHint: string;
  }>;
  sampleData: Record<string, string>[];
  transformRules: Array<Record<string, unknown>>;
}

export interface MappingSuggestion {
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
  matchType: string;
  reason: string;
}

export interface MappingRule {
  id: string;
  templateId: string;
  sourcePattern: string;
  targetColumn: string;
  matchType: string;
  transformType: string;
  transformConfig: Record<string, unknown>;
  confidence: number;
  isConfirmed: boolean;
  createdAt: string;
}

export interface NormalizationHistory {
  id: string;
  templateId: string;
  templateName: string;
  inputFilename: string;
  outputFilename: string;
  rowCount: number;
  columnCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

// ResponseEnvelope wrapper — customInstance returns response.data (the envelope)
interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: unknown;
}

function extractData<T>(envelope: Envelope<T>): T {
  return envelope.data;
}

// ── Templates ──────────────────────────────────────────────────

export async function fetchTemplates(): Promise<NormalizerTemplate[]> {
  const envelope = await customInstance<Envelope<NormalizerTemplate[]>>({
    url: `${API_BASE}/templates`,
    method: 'GET',
  });
  return extractData(envelope);
}

export async function fetchTemplate(id: string): Promise<NormalizerTemplateDetail> {
  const envelope = await customInstance<Envelope<NormalizerTemplateDetail>>({
    url: `${API_BASE}/templates/${id}`,
    method: 'GET',
  });
  return extractData(envelope);
}

export async function createTemplate(
  name: string,
  description: string,
  file: File,
): Promise<NormalizerTemplateDetail> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', description);
  formData.append('file', file);
  const envelope = await customInstance<Envelope<NormalizerTemplateDetail>>({
    url: `${API_BASE}/templates`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
  return extractData(envelope);
}

export async function deleteTemplate(id: string): Promise<void> {
  await customInstance<Envelope<null>>({
    url: `${API_BASE}/templates/${id}`,
    method: 'DELETE',
  });
}

// ── Mapping ────────────────────────────────────────────────────

export async function suggestMapping(
  templateId: string,
  file: File,
): Promise<MappingSuggestion[]> {
  const formData = new FormData();
  formData.append('file', file);
  const envelope = await customInstance<Envelope<MappingSuggestion[]>>({
    url: `${API_BASE}/templates/${templateId}/suggest-mapping`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
  return extractData(envelope);
}

export async function saveMappings(
  templateId: string,
  rules: Array<{
    sourcePattern: string;
    targetColumn: string;
    matchType?: string;
    transformType?: string;
    transformConfig?: Record<string, unknown>;
  }>,
): Promise<MappingRule[]> {
  const envelope = await customInstance<Envelope<MappingRule[]>>({
    url: `${API_BASE}/templates/${templateId}/mappings`,
    method: 'PUT',
    data: rules,
  });
  return extractData(envelope);
}

export async function fetchMappings(templateId: string): Promise<MappingRule[]> {
  const envelope = await customInstance<Envelope<MappingRule[]>>({
    url: `${API_BASE}/templates/${templateId}/mappings`,
    method: 'GET',
  });
  return extractData(envelope);
}

// ── Normalize ──────────────────────────────────────────────────

export async function normalizeFile(
  templateId: string,
  file: File,
): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', file);
  return customInstance<Blob>({
    url: `${API_BASE}/templates/${templateId}/normalize`,
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
    responseType: 'blob',
  });
}

// ── History ────────────────────────────────────────────────────

export async function fetchHistory(
  templateId: string,
  limit = 50,
): Promise<NormalizationHistory[]> {
  const envelope = await customInstance<Envelope<NormalizationHistory[]>>({
    url: `${API_BASE}/templates/${templateId}/history`,
    method: 'GET',
    params: { limit },
  });
  return extractData(envelope);
}
