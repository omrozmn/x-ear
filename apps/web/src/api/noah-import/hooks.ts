// Noah Import Connector — React Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/orval-mutator';
import type {
  ImportSession,
  AgentDevice,
  PossibleDuplicate,
  ImportAuditLog,
  CreateImportSessionRequest,
  EnrollmentTokenRequest,
  EnrollmentTokenResponse,
  DuplicateMergeRequest,
  ApiEnvelope,
} from './types';

const BASE = '/api/noah-import';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const method = init?.method?.toUpperCase() || 'GET';
  const response = await apiClient.request<ApiEnvelope<T>>({
    url: `${BASE}${path}`,
    method,
    data: init?.body ? JSON.parse(init.body as string) : undefined,
  });
  return response.data;
}

// ── Keys ─────────────────────────────────────────────────
const keys = {
  sessions: ['noah-import', 'sessions'] as const,
  session: (id: string) => ['noah-import', 'sessions', id] as const,
  agents: ['noah-import', 'agents'] as const,
  duplicates: ['noah-import', 'duplicates'] as const,
  auditLogs: ['noah-import', 'audit-logs'] as const,
};

// ── Import Sessions ──────────────────────────────────────

/** Create a new import session (one-click trigger). */
export function useCreateImportSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateImportSessionRequest) => {
      const res = await apiFetch<ImportSession>('/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.sessions }),
  });
}

/** Poll session status. */
export function useImportSession(sessionId: string | null, { enabled = true, pollInterval = 3000 } = {}) {
  return useQuery({
    queryKey: keys.session(sessionId!),
    queryFn: async () => {
      const res = await apiFetch<ImportSession>(`/sessions/${sessionId}`);
      return res.data;
    },
    enabled: !!sessionId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && ['completed', 'completed_with_warnings', 'failed', 'expired'].includes(status)) {
        return false; // Stop polling
      }
      return pollInterval;
    },
  });
}

/** List import sessions. */
export function useImportSessions(page = 1, status?: string) {
  return useQuery({
    queryKey: [...keys.sessions, { page, status }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set('status', status);
      const res = await apiFetch<ImportSession[]>(`/sessions?${params}`);
      return { data: res.data, meta: res.meta };
    },
  });
}

// ── Agent Devices ────────────────────────────────────────

/** Get agent status for settings page. */
export function useAgentDevices() {
  return useQuery({
    queryKey: keys.agents,
    queryFn: async () => {
      const res = await apiFetch<AgentDevice[]>('/agents');
      return res.data;
    },
    refetchInterval: 30000, // Poll every 30s for live status
  });
}

/** Generate enrollment token. */
export function useGenerateEnrollmentToken() {
  return useMutation({
    mutationFn: async (body: EnrollmentTokenRequest) => {
      const res = await apiFetch<EnrollmentTokenResponse>('/agents/enrollment-token', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
  });
}

// ── Duplicates ───────────────────────────────────────────

/** List possible duplicates for merge center. */
export function useDuplicates(page = 1, status?: string, sessionId?: string) {
  return useQuery({
    queryKey: [...keys.duplicates, { page, status, sessionId }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set('status', status);
      if (sessionId) params.set('sessionId', sessionId);
      const res = await apiFetch<PossibleDuplicate[]>(`/duplicates?${params}`);
      return { data: res.data, meta: res.meta };
    },
  });
}

/** Resolve a duplicate (merge or dismiss). */
export function useResolveDuplicate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: DuplicateMergeRequest & { id: string }) => {
      const res = await apiFetch<PossibleDuplicate>(`/duplicates/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.duplicates }),
  });
}

// ── Audit Logs ───────────────────────────────────────────

/** List audit logs for a session. */
export function useAuditLogs(sessionId?: string, page = 1) {
  return useQuery({
    queryKey: [...keys.auditLogs, { sessionId, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (sessionId) params.set('sessionId', sessionId);
      const res = await apiFetch<ImportAuditLog[]>(`/audit-logs?${params}`);
      return { data: res.data, meta: res.meta };
    },
    enabled: !!sessionId,
  });
}
