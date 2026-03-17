/**
 * Marketplace Listings API Client Adapter
 */
export {
  listMarketplaceListings,
  createMarketplaceListing,
  updateMarketplaceListing,
  deleteMarketplaceListing,
  aiAutoFillListings,
  publishMarketplaceListing,
  getListMarketplaceListingsQueryKey,
  useListMarketplaceListings,
  useCreateMarketplaceListing,
  useUpdateMarketplaceListing,
  useDeleteMarketplaceListing,
  useAiAutoFillListings,
  usePublishMarketplaceListing,
} from '@/api/generated/index';

export type {
  MarketplaceListingCreate,
  MarketplaceListingUpdate,
  MarketplaceListingRead,
  AIFillRequest,
  AIFillResponse,
} from '@/api/generated/schemas';
