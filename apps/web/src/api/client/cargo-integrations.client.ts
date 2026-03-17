// TODO: Backend endpoints not yet registered as OpenAPI tags
// Types are available from schemas, hooks are stubbed
export * from '@/api/generated/schemas';

// Stub hooks until backend registers these endpoints
const stubHook = (..._args: any[]) => ({ data: undefined, isLoading: false, mutate: () => {}, mutateAsync: async () => ({}) } as any);
const stubFn = async (..._args: any[]) => ({} as any);
export const useListCargoIntegrations = stubHook;
export const useCreateCargoIntegration = stubHook;
export const useUpdateCargoIntegration = stubHook;
export const useTestCargoIntegration = stubHook;
export type CargoIntegrationRead = any;
