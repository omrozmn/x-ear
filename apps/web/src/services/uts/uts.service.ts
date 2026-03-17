import { apiClient } from '@/api/orval-mutator';

export type UtsEnvironment = 'test' | 'prod';
export type UtsAuthScheme = 'auto' | 'bearer' | 'plain_authorization' | 'uts_token' | 'x_uts_token' | 'token';

export interface UtsConnectionTestResult {
  ok: boolean;
  httpStatus?: number | null;
  message: string;
  tokenValid?: boolean | null;
  testedUrl: string;
  testedAt: string;
  authSchemeUsed?: string | null;
  rawErrorCode?: string | null;
  rawResponse?: string | null;
}

export interface UtsMessageChannels {
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
}

export interface UtsMessageTemplate {
  enabled: boolean;
  templateName: string;
  subject?: string | null;
  bodyText: string;
  variables: string[];
  channels: UtsMessageChannels;
}

export interface UtsSyncStatus {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncAt?: string | null;
  lastSyncMessage?: string | null;
  lastSyncOk?: boolean | null;
  syncedRecords: number;
}

export interface UtsTekilUrunQueryRequest {
  productNumber: string;
  serialNumber?: string;
  lotBatchNumber?: string;
}

export interface UtsTekilUrunRecord {
  productNumber: string;
  serialNumber?: string | null;
  lotBatchNumber?: string | null;
  quantity?: number | null;
  availableQuantity?: number | null;
  productName?: string | null;
  manufactureDate?: string | null;
  importDate?: string | null;
  expiryDate?: string | null;
  ownerInstitutionNumber?: string | null;
  manufacturerInstitutionNumber?: string | null;
  raw: Record<string, unknown>;
}

export interface UtsTekilUrunQueryResponse {
  success: boolean;
  items: UtsTekilUrunRecord[];
  message?: string | null;
  isOwned?: boolean | null;
  ourMemberNumber?: string | null;
  queriedProductNumbers: string[];
  rawResponse?: Record<string, unknown> | null;
}

export interface UtsVermeDraftRequest {
  productNumber: string;
  serialNumber?: string;
  lotBatchNumber?: string;
  quantity: number;
  recipientInstitutionNumber: string;
  documentNumber: string;
}

export interface UtsVermeDraftResponse {
  success: boolean;
  payload: Record<string, unknown>;
  message?: string | null;
}

export type UtsSerialStatus = 'owned' | 'pending_receipt' | 'not_owned';

export interface UtsSerialState {
  serialKey: string;
  status: UtsSerialStatus;
  inventoryId?: string | null;
  inventoryName?: string | null;
  productName?: string | null;
  productNumber?: string | null;
  serialNumber?: string | null;
  lotBatchNumber?: string | null;
  supplierName?: string | null;
  supplierId?: string | null;
  institutionNumber?: string | null;
  documentNumber?: string | null;
  lastMovementType?: string | null;
  lastMovementId?: string | null;
  lastMessage?: string | null;
  lastMovementAt?: string | null;
  updatedAt?: string | null;
  rawResponse?: string | null;
}

export interface UtsBulkMovementExecuteResponse {
  success: boolean;
  movementType: string;
  total: number;
  successful: number;
  failed: number;
  results: UtsMovementExecuteResponse[];
}

export interface UtsSerialStateListResponse {
  success: boolean;
  items: UtsSerialState[];
  total: number;
}

export interface UtsSerialStateUpsertRequest {
  status: UtsSerialStatus;
  inventoryId?: string;
  inventoryName?: string;
  productName?: string;
  productNumber?: string;
  serialNumber?: string;
  lotBatchNumber?: string;
  supplierName?: string;
  supplierId?: string;
  institutionNumber?: string;
  documentNumber?: string;
  lastMessage?: string;
  lastMovementType?: string;
  rawResponse?: string;
}

export interface UtsMovementRequest {
  inventoryId?: string;
  inventoryName?: string;
  productName?: string;
  supplierName?: string;
  supplierId?: string;
  productNumber: string;
  serialNumber?: string;
  lotBatchNumber?: string;
  quantity: number;
  recipientInstitutionNumber?: string;
  sourceInstitutionNumber?: string;
  documentNumber?: string;
}

export interface UtsMovementExecuteResponse {
  success: boolean;
  utsSuccess: boolean;
  httpStatus?: number | null;
  message: string;
  movementType: string;
  movementId?: string | null;
  state?: UtsSerialState | null;
  rawResponse?: string | null;
}

export interface UtsConfig {
  enabled: boolean;
  environment: UtsEnvironment;
  authScheme: UtsAuthScheme;
  baseUrl: string;
  tokenConfigured: boolean;
  tokenMasked: string;
  companyCode?: string | null;
  companyCodeSource?: string | null;
  memberNumber?: string | null;
  memberNumberSource?: string | null;
  identityDiscoverySupported: boolean;
  identityDiscoveryStatus: string;
  autoSendNotifications: boolean;
  notificationMode: 'manual' | 'outbox';
  autoAddToInventoryOnAlma: boolean;
  autoDecreaseStockOnVerme: boolean;
  documentationUrl: string;
  testEndpointUrl: string;
  lastTest?: UtsConnectionTestResult | null;
  publicIp?: string | null;
  publicIpDetectedAt?: string | null;
  tokenSetupSteps: string[];
  notificationTemplates: Record<string, UtsMessageTemplate>;
  sync: UtsSyncStatus;
}

export interface UtsConfigUpdate {
  enabled: boolean;
  environment: UtsEnvironment;
  authScheme: UtsAuthScheme;
  token?: string;
  companyCode?: string;
  memberNumber?: string;
  autoSendNotifications: boolean;
  notificationMode: 'manual' | 'outbox';
  autoAddToInventoryOnAlma?: boolean;
  autoDecreaseStockOnVerme?: boolean;
  baseUrlOverride?: string;
  notificationTemplates: Record<string, UtsMessageTemplate>;
}

export interface UtsAddToInventoryResponse {
  success: boolean;
  message: string;
  inventoryId?: string | null;
  created: boolean;
  serialAdded: boolean;
  stockUpdated: boolean;
  barcodeUpdated: boolean;
}

interface Envelope<T> {
  data?: T;
  message?: string;
}

const get = async <T>(url: string) => {
  const response = await apiClient.get<Envelope<T>>(url);
  return response.data?.data as T;
};

const getWithParams = async <T>(url: string, params?: Record<string, unknown>) => {
  const response = await apiClient.get<Envelope<T>>(url, { params });
  return response.data?.data as T;
};

const send = async <T>(method: 'post' | 'put', url: string, body?: unknown) => {
  const response = method === 'put'
    ? await apiClient.put<Envelope<T>>(url, body)
    : await apiClient.post<Envelope<T>>(url, body ?? {});
  return response.data?.data as T;
};

export const utsService = {
  getConfig: async () => get<UtsConfig>('/api/uts/config'),
  updateConfig: async (body: UtsConfigUpdate) => send<UtsConfig>('put', '/api/uts/config', body),
  testConfig: async () => send<UtsConnectionTestResult>('post', '/api/uts/config/test'),
  runSync: async () => send<UtsSyncStatus>('post', '/api/uts/sync/run'),
  queryTekilUrun: async (body: UtsTekilUrunQueryRequest) => send<UtsTekilUrunQueryResponse>('post', '/api/uts/query/tekil-urun', body),
  createVermeDraft: async (body: UtsVermeDraftRequest) => send<UtsVermeDraftResponse>('post', '/api/uts/verme/draft', body),
  sendVerme: async (body: UtsVermeDraftRequest) => send<UtsConnectionTestResult>('post', '/api/uts/verme/send', body),
  listSerialStates: async (params?: { status?: UtsSerialStatus; inventoryId?: string; search?: string }) => getWithParams<UtsSerialStateListResponse>('/api/uts/serial-states', params),
  upsertSerialState: async (body: UtsSerialStateUpsertRequest) => send<UtsSerialState>('put', '/api/uts/serial-states', body),
  executeVerme: async (body: UtsMovementRequest) => send<UtsMovementExecuteResponse>('post', '/api/uts/verme/execute', body),
  executeAlma: async (body: UtsMovementRequest) => send<UtsMovementExecuteResponse>('post', '/api/uts/alma/execute', body),
  addSerialToInventory: async (serialKey: string, brand?: string, model?: string) => send<UtsAddToInventoryResponse>('post', '/api/uts/serial-states/add-to-inventory', { serialKey, brand, model }),
  listRegistrations: async () => get<unknown[]>('/api/uts/registrations'),
  createUtRegistrationBulk: async (body: unknown) => send<unknown>('post', '/api/uts/registrations/bulk', body),
  getUtJob: async (jobId: string) => get<unknown>(`/api/uts/jobs/${jobId}`),
  createUtJobCancel: async (jobId: string) => send<unknown>('post', `/api/uts/jobs/${jobId}/cancel`),
};

export default utsService;
