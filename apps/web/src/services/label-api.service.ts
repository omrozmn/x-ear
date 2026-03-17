/**
 * Label Generation Service API Client
 *
 * Communicates with the label-generation-service REST API for template
 * management and label rendering.
 */
import axios, { type AxiosInstance } from 'axios';

// ---------------------------------------------------------------------------
// Types (mirroring label-generation-service types)
// ---------------------------------------------------------------------------

export type TemplateStatus = 'draft' | 'published' | 'archived';
export type UnitType = 'mm' | 'px' | 'inch';
export type Orientation = 'portrait' | 'landscape';
export type ComponentType = 'text' | 'barcode' | 'image' | 'shape' | 'qrcode';
export type ShapeType = 'rect' | 'circle' | 'line';
export type TextAlign = 'left' | 'center' | 'right';

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutConfig {
  width: number;
  height: number;
  unit: UnitType;
  dpi: number;
  orientation: Orientation;
  margins: Margins;
}

export interface ComponentConfig {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  properties: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  version: number;
  status: TemplateStatus;
  layout: LayoutConfig;
  components: ComponentConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  layout: LayoutConfig;
  components?: ComponentConfig[];
}

export interface UpdateTemplateInput {
  name?: string;
  layout?: LayoutConfig;
  components?: ComponentConfig[];
}

export interface RenderRequest {
  templateId: string;
  data: Record<string, unknown>;
  format?: 'svg';
}

export interface RenderResult {
  svg: string;
  templateId: string;
  renderedAt: string;
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_LABEL_SERVICE_URL ?? '/api/label-service';

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 30_000,
  });
}

const client = createClient();

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

/** List all templates. */
export async function listTemplates(): Promise<Template[]> {
  const response = await client.get<Template[]>('/api/v1/templates');
  return response.data;
}

/** Create a new template. */
export async function createTemplate(
  input: CreateTemplateInput,
): Promise<Template> {
  const response = await client.post<Template>('/api/v1/templates', input);
  return response.data;
}

/** Get a template by ID. */
export async function getTemplate(id: string): Promise<Template> {
  const response = await client.get<Template>(`/api/v1/templates/${id}`);
  return response.data;
}

/** Update an existing template. */
export async function updateTemplate(
  id: string,
  input: UpdateTemplateInput,
): Promise<Template> {
  const response = await client.put<Template>(
    `/api/v1/templates/${id}`,
    input,
  );
  return response.data;
}

/** Publish a draft template. */
export async function publishTemplate(id: string): Promise<Template> {
  const response = await client.post<Template>(
    `/api/v1/templates/${id}/publish`,
  );
  return response.data;
}

/** Render a template with data. Returns raw SVG string. */
export async function renderTemplate(
  request: RenderRequest,
): Promise<string> {
  const response = await client.post('/api/v1/render', request, {
    responseType: 'text',
    headers: { Accept: 'image/svg+xml' },
  });
  return response.data as string;
}

/** Health check for the label service. */
export async function healthCheck(): Promise<boolean> {
  try {
    await client.get('/health');
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Printer types
// ---------------------------------------------------------------------------

export interface PrinterInfo {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  protocol: 'tcp9100' | 'ipp' | 'browser';
  status: 'online' | 'offline' | 'error';
  capabilities?: {
    maxWidth?: number;
    maxHeight?: number;
    dpi?: number;
    supportedFormats?: string[];
  };
  lastHealthCheck?: string;
}

export interface PrintJobInfo {
  id: string;
  templateId: string;
  printerId: string;
  data: Record<string, unknown>;
  outputFormat: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Printer API methods
// ---------------------------------------------------------------------------

/** List all registered printers. */
export async function listPrinters(): Promise<PrinterInfo[]> {
  const response = await client.get<PrinterInfo[]>('/api/v1/printers');
  return response.data;
}

/** Submit a print job to a specific printer. */
export async function submitPrintJob(
  templateId: string,
  printerId: string,
  data: Record<string, unknown>,
  copies?: number,
): Promise<PrintJobInfo | PrintJobInfo[]> {
  const response = await client.post('/api/v1/print', {
    templateId,
    printerId,
    data,
    copies: copies ?? 1,
  });
  return response.data;
}

/** Get the status of a print job. */
export async function getJobStatus(jobId: string): Promise<PrintJobInfo> {
  const response = await client.get<PrintJobInfo>(`/api/v1/print/jobs/${jobId}`);
  return response.data;
}

// ---------------------------------------------------------------------------
// Convenience namespace export
// ---------------------------------------------------------------------------

export const labelApiService = {
  listTemplates,
  createTemplate,
  getTemplate,
  updateTemplate,
  publishTemplate,
  renderTemplate,
  healthCheck,
  listPrinters,
  submitPrintJob,
  getJobStatus,
} as const;
