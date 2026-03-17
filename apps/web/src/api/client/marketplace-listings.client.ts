/**
 * Marketplace Listings API Client
 */
import { customInstance } from '@/api/orval-mutator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface MarketplaceListing {
  id: string;
  inventoryId: string;
  integrationId: string;
  listingData?: string;
  marketplaceTitle?: string;
  marketplaceDescription?: string;
  marketplacePrice?: number;
  marketplaceStock?: number;
  marketplaceBarcode?: string;
  marketplaceBrand?: string;
  marketplaceCategoryId?: string;
  status: string;
  remoteProductId?: string;
  lastSyncedAt?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketplaceListingCreate {
  integrationId: string;
  listingData?: string;
  marketplaceTitle?: string;
  marketplaceDescription?: string;
  marketplacePrice?: number;
  marketplaceStock?: number;
  marketplaceBarcode?: string;
  marketplaceBrand?: string;
  marketplaceCategoryId?: string;
}

export interface MarketplaceListingUpdate {
  listingData?: string;
  marketplaceTitle?: string;
  marketplaceDescription?: string;
  marketplacePrice?: number;
  marketplaceStock?: number;
  marketplaceBarcode?: string;
  marketplaceBrand?: string;
  marketplaceCategoryId?: string;
  status?: string;
}

export interface AIFillResponse {
  platform: string;
  marketplaceTitle?: string;
  marketplaceDescription?: string;
  marketplacePrice?: number;
  listingData?: string;
}

// API functions
export const listMarketplaceListings = (inventoryId: string) =>
  customInstance<{ data: MarketplaceListing[] }>({ url: `/api/inventory/${inventoryId}/marketplace-listings`, method: 'GET' });

export const createMarketplaceListing = (inventoryId: string, data: MarketplaceListingCreate) =>
  customInstance<{ data: MarketplaceListing }>({ url: `/api/inventory/${inventoryId}/marketplace-listings`, method: 'POST', data });

export const updateMarketplaceListing = (inventoryId: string, listingId: string, data: MarketplaceListingUpdate) =>
  customInstance<{ data: MarketplaceListing }>({ url: `/api/inventory/${inventoryId}/marketplace-listings/${listingId}`, method: 'PUT', data });

export const deleteMarketplaceListing = (inventoryId: string, listingId: string) =>
  customInstance<{ success: boolean }>({ url: `/api/inventory/${inventoryId}/marketplace-listings/${listingId}`, method: 'DELETE' });

export const aiAutoFillListings = (inventoryId: string, platform?: string) =>
  customInstance<{ data: AIFillResponse[] }>({ url: `/api/inventory/${inventoryId}/marketplace-listings/ai-fill`, method: 'POST', data: { platform } });

export const publishMarketplaceListing = (inventoryId: string, listingId: string) =>
  customInstance<{ success: boolean }>({ url: `/api/inventory/${inventoryId}/marketplace-listings/${listingId}/publish`, method: 'POST' });

// Query keys
export const getMarketplaceListingsQueryKey = (inventoryId: string) => ['marketplace-listings', inventoryId];

// Hooks
export function useListMarketplaceListings(inventoryId: string) {
  return useQuery({
    queryKey: getMarketplaceListingsQueryKey(inventoryId),
    queryFn: () => listMarketplaceListings(inventoryId),
    enabled: !!inventoryId,
  });
}

export function useCreateMarketplaceListing(inventoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MarketplaceListingCreate) => createMarketplaceListing(inventoryId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getMarketplaceListingsQueryKey(inventoryId) }),
  });
}

export function useUpdateMarketplaceListing(inventoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, data }: { listingId: string; data: MarketplaceListingUpdate }) =>
      updateMarketplaceListing(inventoryId, listingId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getMarketplaceListingsQueryKey(inventoryId) }),
  });
}

export function useDeleteMarketplaceListing(inventoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => deleteMarketplaceListing(inventoryId, listingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getMarketplaceListingsQueryKey(inventoryId) }),
  });
}

export function useAIAutoFillListings(inventoryId: string) {
  return useMutation({
    mutationFn: (platform?: string) => aiAutoFillListings(inventoryId, platform),
  });
}
