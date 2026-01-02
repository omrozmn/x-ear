// TODO: UTS endpoints swagger'a eklenmeli ve ORVAL generate edilmeli
// Backend /api/uts/* endpoints için OpenAPI spec gerekli
// Şu an için customInstance kullanarak geçici çözüm:

import { customInstance } from '../../api/orval-mutator';
import { unwrapObject, unwrapArray } from '../../utils/response-unwrap';

const base = '/api/uts';

export const utsService = {
  listRegistrations: async (params?: Record<string, any>) => {
    const response = await customInstance({ url: `${base}/registrations`, method: 'GET', params });
    return unwrapArray<any>(response);
  },
  startBulkRegistration: async (body: any) => {
    const response = await customInstance({ url: `${base}/registrations/bulk`, method: 'POST', data: body });
    return unwrapObject<any>(response);
  },
  getJobStatus: async (jobId: string) => {
    const response = await customInstance({ url: `${base}/jobs/${encodeURIComponent(jobId)}`, method: 'GET' });
    return unwrapObject<any>(response);
  },
  cancelJob: async (jobId: string) => {
    const response = await customInstance({ url: `${base}/jobs/${encodeURIComponent(jobId)}/cancel`, method: 'POST' });
    return unwrapObject<any>(response);
  },
};

export default utsService;
