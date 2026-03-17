import { apiClient } from '../lib/api';

const LABEL_SERVICE_URL = import.meta.env.VITE_LABEL_SERVICE_URL || 'http://localhost:3050';

const labelClient = apiClient;
const labelBaseURL = LABEL_SERVICE_URL;

// --- Types ---

export type TemplateStatus = 'draft' | 'published' | 'archived';
export type UnitType = 'mm' | 'px' | 'inch';
export type Orientation = 'portrait' | 'landscape';
export type ComponentType = 'text' | 'barcode' | 'image' | 'shape' | 'qrcode';

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

// --- Service ---

export const labelService = {
  async listTemplates(): Promise<Template[]> {
    const { data } = await labelClient.get<Template[]>('/api/v1/templates', { baseURL: labelBaseURL });
    return data;
  },

  async getTemplate(id: string): Promise<Template> {
    const { data } = await labelClient.get<Template>(`/api/v1/templates/${id}`, { baseURL: labelBaseURL });
    return data;
  },

  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    const { data } = await labelClient.post<Template>('/api/v1/templates', input, { baseURL: labelBaseURL });
    return data;
  },

  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<Template> {
    const { data } = await labelClient.put<Template>(`/api/v1/templates/${id}`, input, { baseURL: labelBaseURL });
    return data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await labelClient.delete(`/api/v1/templates/${id}`, { baseURL: labelBaseURL });
  },

  async publishTemplate(id: string): Promise<Template> {
    const { data } = await labelClient.post<Template>(`/api/v1/templates/${id}/publish`, undefined, { baseURL: labelBaseURL });
    return data;
  },

  async renderPreview(req: RenderRequest): Promise<RenderResult> {
    const { data } = await labelClient.post<RenderResult>('/api/v1/render', req, { baseURL: labelBaseURL });
    return data;
  },

  getServiceUrl(): string {
    return LABEL_SERVICE_URL;
  },
};
