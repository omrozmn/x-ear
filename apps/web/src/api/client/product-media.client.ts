// TODO: Backend endpoints not yet registered as OpenAPI tags
// Types are available from schemas, hooks are stubbed
export * from '@/api/generated/schemas';

// Stub hooks until backend registers these endpoints
const stubHook = (..._args: any[]) => ({ data: undefined, isLoading: false, mutate: () => {}, mutateAsync: async () => ({}) } as any);
const stubFn = async (..._args: any[]) => ({} as any);
export const useListProductMedia = stubHook;
export const useCreateProductMedia = stubHook;
export const useDeleteProductMedia = stubHook;
export const useReorderProductMedia = stubHook;
export const getMediaPresignedUrl = stubFn;
export const updateProductMedia = stubFn;
export type ProductMediaRead = any;
