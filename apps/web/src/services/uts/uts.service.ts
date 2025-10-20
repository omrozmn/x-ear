// NOTE: Prefer Orval-generated client; fallback to direct fetch if Orval operation
// names are not present in the generated client. Replace these with Orval calls
// once OpenAPI includes the UTS paths.

const base = '/api/uts';

async function handleJson(resp: Response) {
  if (!resp.ok) throw new Error(`UTS request failed: ${resp.status}`);
  return resp.json();
}

export const utsService = {
  listRegistrations: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(`${base}/registrations${query}`).then(handleJson);
  },
  startBulkRegistration: (body: any, opts?: any) =>
    fetch(`${base}/registrations/bulk`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) } }).then(handleJson),
  getJobStatus: (jobId: string) => fetch(`${base}/jobs/${encodeURIComponent(jobId)}`).then(handleJson),
  cancelJob: (jobId: string) => fetch(`${base}/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' }).then(handleJson),
};

export default utsService;
