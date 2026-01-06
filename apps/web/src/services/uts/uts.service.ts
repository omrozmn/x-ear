// UTS endpoints are now generated via Orval
import {
  listRegistrations,
  startBulkRegistration,
  getJobStatus,
  cancelJob
} from '../../api/generated/uts/uts';
import { unwrapObject, unwrapArray } from '../../utils/response-unwrap';
import { ListRegistrationsParams, BulkRegistration } from '../../api/generated/schemas';

export const utsService = {
  listRegistrations: async (params?: ListRegistrationsParams) => {
    const response = await listRegistrations(params);
    return unwrapArray<any>(response);
  },
  startBulkRegistration: async (body: BulkRegistration) => {
    const response = await startBulkRegistration(body);
    return unwrapObject<any>(response);
  },
  getJobStatus: async (jobId: string) => {
    const response = await getJobStatus(jobId);
    return unwrapObject<any>(response);
  },
  cancelJob: async (jobId: string) => {
    const response = await cancelJob(jobId);
    return unwrapObject<any>(response);
  },
};

export default utsService;
