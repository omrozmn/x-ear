import axios from 'axios';

const BARCODE_SERVICE_URL = import.meta.env.VITE_BARCODE_SERVICE_URL || 'http://localhost:8090';

const barcodeClient = axios.create({
  baseURL: BARCODE_SERVICE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// --- Types ---

export type Symbology =
  | 'code128'
  | 'code39'
  | 'ean13'
  | 'ean8'
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
  gtin: string | null;
  lot: string | null;
  expiry: string | null;
  serial: string | null;
}

export interface UDIResult {
  di: string | null;
  pi: string | null;
  lot: string | null;
  expiry: string | null;
  serial: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  gs1: GS1ParsedResult | null;
  udi: UDIResult | null;
  checksum_valid: boolean | null;
}

export interface HealthResponse {
  status: string;
}

// --- Service ---

export const barcodeService = {
  async health(): Promise<HealthResponse> {
    const { data } = await barcodeClient.get<HealthResponse>('/health');
    return data;
  },

  async generate(req: GenerateBarcodeRequest): Promise<Blob> {
    const response = await barcodeClient.post('/api/v1/barcode/generate', req, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  async validate(req: ValidateBarcodeRequest): Promise<ValidationResult> {
    const { data } = await barcodeClient.post<ValidationResult>(
      '/api/v1/barcode/validate',
      req,
    );
    return data;
  },

  getServiceUrl(): string {
    return BARCODE_SERVICE_URL;
  },

  setServiceUrl(url: string): void {
    barcodeClient.defaults.baseURL = url;
  },
};
