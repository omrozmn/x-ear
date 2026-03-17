/**
 * Barcode Service API Client
 *
 * Communicates with the barcode-service REST API for barcode generation,
 * validation, and batch operations.
 */
// Barcode service runs on a separate base URL - requires its own axios instance.
// eslint-disable-next-line no-restricted-imports
import axios, { type AxiosInstance } from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Symbology =
  | 'code128'
  | 'ean13'
  | 'ean8'
  | 'code39'
  | 'qrcode'
  | 'datamatrix'
  | 'gs1_datamatrix';

export type OutputFormat = 'png' | 'svg' | 'zpl';

export interface GenerateBarcodeRequest {
  symbology: Symbology;
  data: string;
  format?: OutputFormat;
  module_width?: number;
  module_height?: number;
  quiet_zone?: number;
}

export interface ValidateBarcodeRequest {
  data: string;
  symbology?: Symbology;
}

export interface GS1ParsedResult {
  ais: Record<string, string>;
  gtin?: string | null;
  lot?: string | null;
  expiry?: string | null;
  serial?: string | null;
}

export interface UDIResult {
  di?: string | null;
  pi?: string | null;
  lot?: string | null;
  expiry?: string | null;
  serial?: string | null;
}

export interface ValidateBarcodeResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  gs1?: GS1ParsedResult | null;
  udi?: UDIResult | null;
  checksum_valid?: boolean | null;
}

export interface BatchItem {
  symbology: Symbology;
  data: string;
  format?: OutputFormat;
  module_width?: number;
  module_height?: number;
  quiet_zone?: number;
}

export interface BatchRequest {
  items: BatchItem[];
}

export interface BatchResultItem {
  index: number;
  success: boolean;
  content_base64?: string | null;
  content_type?: string | null;
  error?: string | null;
}

export interface BatchResponse {
  results: BatchResultItem[];
  total: number;
  successful: number;
  failed: number;
}

export interface HealthResponse {
  status: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_BARCODE_SERVICE_URL ?? '/api/barcode-service';

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

/**
 * Generate a barcode image. Returns raw binary data (PNG/SVG/ZPL).
 */
export async function generateBarcode(
  req: GenerateBarcodeRequest,
): Promise<Blob> {
  const response = await client.post('/api/v1/barcode/generate', req, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

/**
 * Validate barcode data against format rules, GS1 AI parsing, and checksum.
 */
export async function validateBarcode(
  req: ValidateBarcodeRequest,
): Promise<ValidateBarcodeResponse> {
  const response = await client.post<ValidateBarcodeResponse>(
    '/api/v1/barcode/validate',
    req,
  );
  return response.data;
}

/**
 * Batch-generate multiple barcodes. Results contain base64-encoded content.
 */
export async function generateBarcodeBatch(
  req: BatchRequest,
): Promise<BatchResponse> {
  const response = await client.post<BatchResponse>(
    '/api/v1/barcode/generate/batch',
    req,
  );
  return response.data;
}

/**
 * Health check for the barcode service.
 */
export async function healthCheck(): Promise<HealthResponse> {
  const response = await client.get<HealthResponse>('/health');
  return response.data;
}

// ---------------------------------------------------------------------------
// Convenience namespace export
// ---------------------------------------------------------------------------

export const barcodeApiService = {
  generateBarcode,
  validateBarcode,
  generateBarcodeBatch,
  healthCheck,
} as const;
