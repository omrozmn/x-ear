// UTS endpoints are now generated via Orval
import {
  listUtRegistrations,
  createUtRegistrationBulk,
  getUtJob,
  createUtJobCancel
} from '../../api/generated/uts/uts';
import { unwrapObject, unwrapArray } from '../../utils/response-unwrap';
import { ListUtRegistrationsParams, BulkRegistration } from '../../api/generated/schemas';

export const utsService = {
  listRegistrations: async (params?: ListUtRegistrationsParams) => {
    const response = await listUtRegistrations(params);
    return unwrapArray<unknown>(response);
  },
  createUtRegistrationBulk: async (body: BulkRegistration) => {
    const response = await createUtRegistrationBulk(body);
    return unwrapObject<unknown>(response);
  },
  getUtJob: async (jobId: string) => {
    const response = await getUtJob(jobId);
    return unwrapObject<unknown>(response);
  },
  createUtJobCancel: async (jobId: string) => {
    const response = await createUtJobCancel(jobId);
    return unwrapObject<unknown>(response);
  },
};

export default utsService;
