import { apiClient } from '../lib/api';

const LABEL_SERVICE_URL = import.meta.env.VITE_LABEL_SERVICE_URL || 'http://localhost:3050';

const printerClient = apiClient;
const printerBaseURL = LABEL_SERVICE_URL;

// --- Types ---

export type PrinterProtocol = 'tcp9100' | 'ipp' | 'browser';
export type PrinterStatus = 'online' | 'offline' | 'error';
export type PrintJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PrinterCapabilities {
  maxWidth?: number;
  maxHeight?: number;
  dpi?: number;
  supportedFormats?: string[];
}

export interface Printer {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  protocol: PrinterProtocol;
  status: PrinterStatus;
  capabilities?: PrinterCapabilities;
  lastHealthCheck?: string;
}

export interface CreatePrinterInput {
  name: string;
  ipAddress: string;
  port: number;
  protocol: PrinterProtocol;
  capabilities?: PrinterCapabilities;
}

export interface PrintJob {
  id: string;
  templateId: string;
  printerId: string;
  data: Record<string, unknown>;
  outputFormat: string;
  status: PrintJobStatus;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  templateVersion?: number;
  copies?: number;
  labelData?: Record<string, unknown>;
}

export interface JobListFilters {
  status?: PrintJobStatus;
  userId?: string;
  printerId?: string;
  templateId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface JobListResult {
  jobs: PrintJob[];
  total: number;
}

export interface JobStats {
  totalJobs: number;
  successRate: number;
  jobsByPrinter: Record<string, number>;
  jobsByTemplate: Record<string, number>;
}

export interface TestResult {
  success: boolean;
  message: string;
  testLabelSent?: boolean;
}

export interface StatusResult {
  id: string;
  status: PrinterStatus;
  error?: string;
}

// --- Service ---

export const printerService = {
  async listPrinters(): Promise<Printer[]> {
    const { data } = await printerClient.get<Printer[]>('/api/v1/printers', { baseURL: printerBaseURL });
    return data;
  },

  async getPrinter(id: string): Promise<Printer> {
    const { data } = await printerClient.get<Printer>(`/api/v1/printers/${id}`, { baseURL: printerBaseURL });
    return data;
  },

  async createPrinter(input: CreatePrinterInput): Promise<Printer> {
    const { data } = await printerClient.post<Printer>('/api/v1/printers', input, { baseURL: printerBaseURL });
    return data;
  },

  async deletePrinter(id: string): Promise<void> {
    await printerClient.delete(`/api/v1/printers/${id}`, { baseURL: printerBaseURL });
  },

  async testPrinter(id: string): Promise<TestResult> {
    const { data } = await printerClient.post<TestResult>(`/api/v1/printers/${id}/test`, undefined, { baseURL: printerBaseURL });
    return data;
  },

  async getPrinterStatus(id: string): Promise<StatusResult> {
    const { data } = await printerClient.get<StatusResult>(`/api/v1/printers/${id}/status`, { baseURL: printerBaseURL });
    return data;
  },

  async listJobs(filters?: JobListFilters): Promise<JobListResult> {
    const params: Record<string, string | number> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.userId) params.userId = filters.userId;
    if (filters?.printerId) params.printerId = filters.printerId;
    if (filters?.templateId) params.templateId = filters.templateId;
    if (filters?.from) params.from = filters.from;
    if (filters?.to) params.to = filters.to;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    const { data } = await printerClient.get<JobListResult>('/api/v1/print/jobs', { params, baseURL: printerBaseURL });
    return data;
  },

  async getJob(id: string): Promise<PrintJob> {
    const { data } = await printerClient.get<PrintJob>(`/api/v1/print/jobs/${id}`, { baseURL: printerBaseURL });
    return data;
  },

  async reprintJob(jobId: string): Promise<PrintJob> {
    const original = await printerService.getJob(jobId);
    const { data } = await printerClient.post<PrintJob>('/api/v1/print', {
      templateId: original.templateId,
      printerId: original.printerId,
      data: original.labelData ?? original.data,
      outputFormat: original.outputFormat,
      copies: 1,
    }, { baseURL: printerBaseURL });
    return data;
  },

  async getJobStats(): Promise<JobStats> {
    const { data } = await printerClient.get<JobStats>('/api/v1/print/stats', { baseURL: printerBaseURL });
    return data;
  },
};
