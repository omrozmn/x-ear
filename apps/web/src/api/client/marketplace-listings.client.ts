// TODO: Backend endpoints not yet registered as OpenAPI tags
// Types are available from schemas, hooks are stubbed
export * from '@/api/generated/schemas';

// Stub hooks until backend registers these endpoints
const stubHook = (..._args: any[]) => ({ data: undefined, isLoading: false, mutate: () => {}, mutateAsync: async () => ({}) } as any);
const stubFn = async (..._args: any[]) => ({} as any);
export const useListMarketplaceListings = stubHook;
export const useCreateMarketplaceListing = stubHook;
export const useUpdateMarketplaceListing = stubHook;
export const useDeleteMarketplaceListing = stubHook;
export const useAiAutoFillListings = stubHook;
export type MarketplaceListingRead = any;
export type MarketplaceListingCreate = any;
export type MarketplaceListingUpdate = any;
export type AIFillResponse = any;
