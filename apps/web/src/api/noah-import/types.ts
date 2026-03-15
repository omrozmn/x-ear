// Noah Import Connector — TypeScript Types
// Matches backend Pydantic schemas in schemas/noah_imports.py

// ── Normalized Data ──────────────────────────────────────
export interface NoahExternalIds {
  noahPatientId?: string | null;
  nationalId?: string | null;
}

export interface NoahPatient {
  externalIds?: NoahExternalIds | null;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  zipCode?: string | null;
  insurance?: string | null;
  physician?: string | null;
  workTelephone?: string | null;
  patientNo?: string | null;
}

export interface NoahAudiogram {
  patientRef?: string | null;
  date?: string | null;
  ear?: string | null;
  conductionType?: string | null;
  thresholds?: Record<string, number> | null;
  masking?: boolean;
  transducer?: string | null;
  audiogramType?: string | null;
  pointStatuses?: Record<string, string> | null;
  notes?: string | null;
}

export interface NoahFitting {
  patientRef?: string | null;
  date?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  deviceSerial?: string | null;
  ear?: string | null;
  notes?: string | null;
  deviceCategory?: string | null;
  batteryType?: string | null;
  earMold?: string | null;
  fittingType?: string | null;
}

export interface NormalizedPayload {
  patients: NoahPatient[];
  audiograms: NoahAudiogram[];
  fittings: NoahFitting[];
}

// ── File & Parser ────────────────────────────────────────
export interface FileMeta {
  name: string;
  size: number;
  sha256: string;
  exportedAt?: string | null;
}

export interface ParserInfo {
  name: string;
  version: string;
}

// ── Import Session ───────────────────────────────────────
export type ImportSessionStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'
  | 'expired';

export interface ImportSessionProgress {
  stage?: string | null;
  percent: number;
}

export interface ImportSessionSummary {
  created: number;
  updated: number;
  skipped: number;
  duplicates: number;
  errors: Array<{ code: string; message: string }>;
}

export interface ImportSession {
  id: string;
  tenantId: string;
  branchId?: string | null;
  requestingUserId: string;
  deviceId?: string | null;
  status: ImportSessionStatus;
  allowedFormats: string[];
  progress: ImportSessionProgress;
  summary: ImportSessionSummary;
  fileMeta?: FileMeta | null;
  parser?: ParserInfo | null;
  expiresAt: string;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// ── Agent Device ─────────────────────────────────────────
export type AgentDeviceStatus = 'active' | 'inactive' | 'revoked';

export interface AgentDevice {
  id: string;
  tenantId: string;
  branchId?: string | null;
  deviceName?: string | null;
  deviceFingerprint?: string | null;
  agentVersion?: string | null;
  status: AgentDeviceStatus;
  exportFolder: string;
  lastSeenAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Auto-detection results from NoahDetector
  noahInstallPath?: string | null;
  noahVersion?: string | null;
  detectedExportFolders?: string[] | null;
  syncMode?: string | null;
  syncIntervalSeconds?: number | null;
}

// ── Possible Duplicate ───────────────────────────────────
export type DuplicateStatus = 'pending' | 'merged' | 'dismissed';

export interface PossibleDuplicate {
  id: string;
  sessionId: string;
  importedData: Record<string, unknown>;
  existingPartyId?: string | null;
  matchScore: number;
  matchReason?: string | null;
  status: DuplicateStatus;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Convenience fields for UI display
  existingPatient?: Record<string, string>;
  importedPatient?: Record<string, string>;
}

// ── Audit Log ────────────────────────────────────────────
export interface ImportAuditLog {
  id: string;
  sessionId: string;
  deviceId?: string | null;
  userId?: string | null;
  action: string;
  detail: Record<string, unknown>;
  fileSha256?: string | null;
  parserVersion?: string | null;
  recordsCreated: number;
  recordsUpdated: number;
  outcome?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// ── Request DTOs ─────────────────────────────────────────
export interface CreateImportSessionRequest {
  branchId?: string | null;
  allowedFormats?: string[] | null;
}

export interface EnrollmentTokenRequest {
  branchId?: string | null;
}

export interface EnrollmentTokenResponse {
  token: string;
  expiresAt: string;
  branchId?: string | null;
}

export interface DuplicateMergeRequest {
  action: 'merge' | 'dismiss';
  targetPartyId?: string | null;
  keepExisting?: boolean;
}

// ── Response Envelope ────────────────────────────────────
export interface ResponseMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: unknown;
  meta?: ResponseMeta;
}
