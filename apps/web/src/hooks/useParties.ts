/**
 * useParties Hook
 * @fileoverview Custom hook for managing party data with caching, search, and real-time updates
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Party, PartyDevice, PartyFilters, PartyStatus, PartySegment } from '../types/party';
import { partyService } from '../services/party.service';
import { partySearchService } from '../services/party/party-search.service';
import { partyCacheService, SimpleCacheFilters } from '../services/party/party-cache.service';
import { partyValidationService } from '../services/party/party-validation.service';
import { partySyncService } from '../services/party/party-sync.service';
import { listPartyDevices } from '@/api/client/parties.client';
import { DeviceAssignmentRead, ResponseEnvelopeListDeviceAssignmentRead } from '@/api/generated/schemas';

interface ExtendedDeviceAssignmentRead extends DeviceAssignmentRead {
  purchaseDate?: string;
  purchase_date?: string;
  warrantyExpiry?: string;
  warranty_expiry?: string;
  lastServiceDate?: string;
  last_service_date?: string;
  batteryType?: string;
  battery_type?: string;
  type?: string;
  deviceType?: string;

  settings?: Record<string, unknown>;
  status?: string; // Override or add status if missing
  side?: string;
  ear?: string; // Override ear type from schema if needed
  sgkScheme?: string;
  sgk_scheme?: string;
  // Fallback for fields that might be missing in DeviceAssignmentRead definition but present in API
  deviceId?: string;
}

// Unified search result type for internal use
interface UnifiedSearchResult {
  parties: Party[];
  totalCount: number;
  filteredCount: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface UsePartiesOptions {
  enableRealTimeSync?: boolean;
  cacheEnabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export interface UsePartiesReturn {
  // Data
  parties: Party[];
  searchResults: UnifiedSearchResult | null;
  totalCount: number;
  isLoading: boolean;
  isSearching: boolean;
  isSyncing: boolean;
  error: string | null;

  // Search & Filter
  searchParties: (filters: SimpleCacheFilters) => Promise<void>;
  clearSearch: () => void;
  applyFilters: (filters: SimpleCacheFilters) => void;

  // CRUD Operations
  createParty: (party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Party>;
  updateParty: (id: string, updates: Partial<Party>) => Promise<Party>;
  deleteParty: (id: string) => Promise<void>;

  // Data Management
  refreshParties: () => Promise<void>;
  syncParties: () => Promise<void>;
  clearCache: () => Promise<void>;

  // Utilities
  getPartyById: (id: string) => Party | undefined;
  validateParty: (party: Partial<Party>) => { isValid: boolean; errors: string[] };
}

export function useParties(options: UsePartiesOptions = {}) {
  const {
    cacheEnabled = true,
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes instead of 30 seconds
    enableRealTimeSync = false
  } = options;

  // State
  const [parties, setParties] = useState<Party[]>([]);
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<SimpleCacheFilters>({});

  // Initialize parties data
  useEffect(() => {
    const initializeParties = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load parties from cache first if enabled
        if (cacheEnabled) {
          const cachedParties = await partyCacheService.getCachedParties();
          if (cachedParties.length > 0) {
            setParties(cachedParties);
            setIsLoading(false);
          }
        }

        // Load fresh data from service
        const partiesResult = await partyService.getParties({ limit: 10000 }); // Get all parties
        setParties(partiesResult.parties);

      } catch (err) {
        console.error('Failed to initialize parties:', err);
        setError(err instanceof Error ? err.message : 'Failed to load parties');
      } finally {
        setIsLoading(false);
      }
    };

    initializeParties();
  }, [cacheEnabled]);

  // Auto refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        const updatedPartiesResult = await partyService.getParties({ limit: 10000 }); // Get all parties
        setParties(updatedPartiesResult.parties);
      } catch (err) {
        console.error('Auto refresh failed:', err);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Real-time sync setup
  useEffect(() => {
    if (!enableRealTimeSync) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith('party_')) {
        // Reload parties when storage changes
        partyService.getParties().then(result => {
          setParties(result.parties);
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [enableRealTimeSync]);

  // Listen for party CRUD events from partyService
  useEffect(() => {
    const handlePartyCreated = (event: CustomEvent) => {
      const { party } = event.detail;
      setParties(prev => [...prev, party]);
    };

    const handlePartyUpdated = (event: CustomEvent) => {
      const { party: updatedParty } = event.detail;
      setParties(prev => prev.map(p => p.id === updatedParty.id ? updatedParty : p));
    };

    const handlePartyDeleted = (event: CustomEvent) => {
      const { id } = event.detail;
      setParties(prev => prev.filter(p => p.id !== id));
    };

    const handlePartiesUpdated = (event: CustomEvent) => {
      const { parties: updatedParties } = event.detail;
      setParties(updatedParties);
    };

    window.addEventListener('party:created', handlePartyCreated as EventListener);
    window.addEventListener('party:updated', handlePartyUpdated as EventListener);
    window.addEventListener('party:deleted', handlePartyDeleted as EventListener);
    window.addEventListener('parties:updated', handlePartiesUpdated as EventListener);

    return () => {
      window.removeEventListener('party:created', handlePartyCreated as EventListener);
      window.removeEventListener('party:updated', handlePartyUpdated as EventListener);
      window.removeEventListener('party:deleted', handlePartyDeleted as EventListener);
      window.removeEventListener('parties:updated', handlePartiesUpdated as EventListener);
    };
  }, []);

  // Search parties
  const searchParties = useCallback(async (filters: SimpleCacheFilters) => {
    try {
      setIsSearching(true);
      setError(null);
      setCurrentFilters(filters);

      let unifiedResults: UnifiedSearchResult;

      if (cacheEnabled && !filters.search) {
        // Use cache for simple filtering
        const cacheResults = await partyCacheService.searchCachedParties(filters);
        // Convert CacheSearchResult to UnifiedSearchResult
        unifiedResults = {
          parties: cacheResults.parties.map(item => ({
            id: item.id,
            firstName: item.firstName,
            lastName: item.lastName,
            tcNumber: item.tcNumber,
            phone: item.phone,
            email: item.email,
            status: item.status as PartyStatus,
            segment: item.segment as PartySegment,
          } as Party)),
          totalCount: cacheResults.totalCount,
          filteredCount: cacheResults.filteredCount,
        };
      } else {
        // Use search service for complex queries
        const partyFilters: PartyFilters = {
          search: filters.search,

          status: filters.status ? (filters.status as unknown as PartyStatus[]) : undefined,
          segment: filters.segment ? (filters.segment as unknown as PartySegment[]) : undefined,
          page: filters.page,
          limit: filters.limit
        };

        // Cast parties to work with search service
        const searchResults = partySearchService.searchParties(parties, partyFilters);
        // Convert PartySearchResult to UnifiedSearchResult
        unifiedResults = {
          parties: searchResults.parties as Party[], // Safe cast if service returns compatible type intra-module
          totalCount: searchResults.total,
          filteredCount: searchResults.total,
          page: searchResults.page,
          pageSize: searchResults.pageSize,
          hasMore: searchResults.hasMore,
        };
      }

      setSearchResults(unifiedResults);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [parties, cacheEnabled]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setCurrentFilters({});
  }, []);

  // Apply filters
  const applyFilters = useCallback((filters: SimpleCacheFilters) => {
    setCurrentFilters(filters);
    searchParties(filters);
  }, [searchParties]);

  // Create party
  const createParty = useCallback(async (partyData: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): Promise<Party> => {
    try {
      setError(null);

      // Validate party data
      // Validator expects Party structure, cast ensures properties check out at runtime or we catch validation errors
      const validation = partyValidationService.validateParty(partyData as unknown as Party);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Create party using service
      const newParty = await partyService.createParty(partyData);

      // Update local state
      setParties(prev => [...prev, newParty]);

      // Cache if enabled
      if (cacheEnabled) {
        await partyCacheService.updateCachedParty(newParty);
      }

      // Sync to server
      if (enableRealTimeSync && newParty.id) {
        await partySyncService.syncSingleParty(newParty.id);
      }

      return newParty;
    } catch (err) {
      console.error('Failed to create party:', err);
      setError(err instanceof Error ? err.message : 'Failed to create party');
      throw err;
    }
  }, [cacheEnabled, enableRealTimeSync]);

  // Update party
  const updateParty = useCallback(async (id: string, updates: Partial<Party>): Promise<Party> => {
    try {
      setError(null);

      const existingParty = parties.find(p => p.id === id);
      if (!existingParty) {
        throw new Error('Party not found');
      }

      const updatedParty = await partyService.updateParty(id, updates);
      if (!updatedParty) {
        throw new Error('Failed to update party');
      }

      // Update local state
      setParties(prev => prev.map(p => p.id === id ? updatedParty : p));

      // Update cache if enabled
      if (cacheEnabled) {
        await partyCacheService.updateCachedParty(updatedParty);
      }

      // Sync to server
      if (enableRealTimeSync) {
        await partySyncService.syncSingleParty(id);
      }

      return updatedParty;
    } catch (err) {
      console.error('Failed to update party:', err);
      setError(err instanceof Error ? err.message : 'Failed to update party');
      throw err;
    }
  }, [parties, cacheEnabled, enableRealTimeSync]);

  // Delete party
  const deleteParty = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);

      const success = await partyService.deleteParty(id);
      if (!success) {
        throw new Error('Failed to delete party');
      }

      // Remove from local state
      setParties(prev => prev.filter(p => p.id !== id));

      // Remove from cache if enabled
      if (cacheEnabled) {
        await partyCacheService.removeCachedParty(id);
      }

      // Sync deletion to server
      if (enableRealTimeSync) {
        // This would typically mark for deletion in outbox
        console.log('Marking party for deletion:', id);
      }
    } catch (err) {
      console.error('Failed to delete party:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete party');
      throw err;
    }
  }, [cacheEnabled, enableRealTimeSync]);

  // Refresh parties
  const refreshParties = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const freshPartiesResult = await partyService.getParties({ limit: 10000 }); // Get all parties
      setParties(freshPartiesResult.parties);

      // Re-apply current filters if any
      if (Object.keys(currentFilters).length > 0) {
        await searchParties(currentFilters);
      }
    } catch (err) {
      console.error('Failed to refresh parties:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh parties');
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters, searchParties]);

  // Sync parties
  const syncParties = useCallback(async () => {
    try {
      setIsSyncing(true);
      setError(null);

      const syncResult = await partySyncService.syncParties();

      if (syncResult.conflicts.length > 0) {
        console.warn('Sync conflicts detected:', syncResult.conflicts);
        // Handle conflicts - could show a modal or notification
      }

      // Refresh local data after sync
      await refreshParties();
    } catch (err) {
      console.error('Failed to sync parties:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync parties');
    } finally {
      setIsSyncing(false);
    }
  }, [refreshParties]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      if (cacheEnabled) {
        await partyCacheService.clearCache();
        // Reload from API
        await refreshParties();
      }
    } catch (err) {
      console.error('Failed to clear cache:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    }
  }, [cacheEnabled, refreshParties]);

  // Get party by ID
  const getPartyById = useCallback((id: string): Party | undefined => {
    return parties.find(p => p.id === id);
  }, [parties]);

  const validateParty = useCallback((party: Partial<Party>) => {
    const validation = partyValidationService.validateParty(party as unknown as Party);
    return {
      isValid: validation.isValid,
      errors: validation.errors.map(e => e.message)
    };
  }, []);

  // Memoized total count
  const totalCount = useMemo(() => {
    return searchResults ? searchResults.totalCount : parties.length;
  }, [searchResults, parties.length]);

  // Return in TanStack Query format for compatibility
  return {
    // TanStack Query compatible format
    data: {
      parties,
      total: totalCount,
      page: 1,
      pageSize: parties.length,
      hasMore: false
    },
    isLoading,
    error,
    refetch: refreshParties,

    // Legacy direct access (for backward compatibility)
    parties,
    searchResults,
    totalCount,
    isSearching,
    isSyncing,

    // Search & Filter
    searchParties,
    clearSearch,
    applyFilters,

    // CRUD Operations
    createParty,
    updateParty,
    deleteParty,

    // Data Management
    refreshParties,
    syncParties,
    clearCache,

    // Utilities
    getPartyById,
    validateParty
  };
}

// Specialized hooks for common use cases
export function useParty(id: string | null) {
  // ... (previous implementation remains same)
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ...
    if (!id) {
      setParty(null);
      return;
    }

    const loadParty = async () => {
      // ...
      try {
        setLoading(true);
        setError(null);
        const partyData = await partyService.getParty(id);
        setParty(partyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load party');
      } finally {
        setLoading(false);
      }
    };

    loadParty();
  }, [id]);

  // Listen for updates to this specific party
  useEffect(() => {
    // ...
    if (!id) return;

    const handlePartyUpdated = (event: CustomEvent) => {
      const { party: updatedParty } = event.detail;
      if (updatedParty.id === id) {
        setParty(updatedParty);
      }
    };

    window.addEventListener('party:updated', handlePartyUpdated as EventListener);
    return () => window.removeEventListener('party:updated', handlePartyUpdated as EventListener);
  }, [id]);

  return { party, loading, error };
}

export function usePartyDevices(partyId: string) {
  const [devices, setDevices] = useState<PartyDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!partyId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await listPartyDevices(partyId);

      // Handle Orval response structure
      let data: ExtendedDeviceAssignmentRead[] = [];
      const envelope = response as unknown as ResponseEnvelopeListDeviceAssignmentRead;

      if (envelope?.data && Array.isArray(envelope.data)) {
        data = envelope.data as unknown as ExtendedDeviceAssignmentRead[];
      } else if ((response as Record<string, unknown>)?.data && Array.isArray((response as Record<string, unknown>).data)) {
        data = (response as Record<string, unknown>).data as ExtendedDeviceAssignmentRead[];
      } else if (Array.isArray(response)) {
        data = response as unknown as ExtendedDeviceAssignmentRead[];
      }

      // Orval returns data directly
      if (Array.isArray(data)) {
        // Map Device[] to PartyDevice[] with required fields
        const mappedDevices: PartyDevice[] = data.map((device) => ({
          id: device.id, // DeviceAssignmentRead has id
          brand: device.brand || '', // string | null -> string
          model: device.model || '',
          serialNumber: device.serialNumber || device.loanerSerialNumber || '',
          side: (device.side || device.earSide || 'left') as 'left' | 'right',
          type: (device.deliveryStatus === 'delivered' ? 'hearing_aid' : 'accessory'), // simplified inference
          status: (device.deliveryStatus || 'active') as 'active' | 'inactive' | 'servicing',
          purchaseDate: device.assignedDate || undefined, // Handle null -> undefined
          warrantyExpiry: undefined, // Not in DeviceAssignmentRead top level
          lastServiceDate: undefined,
          batteryType: undefined,
          price: (device.salePrice as unknown as number) || undefined, // device.salePrice is number | null?
          sgkScheme: device.sgkScheme,
          settings: undefined,
        }));
        setDevices(mappedDevices);
      } else {
        setDevices([]);
      }
    } catch (err) {
      console.error('Failed to fetch party devices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Listen for device updates
  useEffect(() => {
    const handleDeviceUpdate = () => {
      fetchDevices();
    };

    window.addEventListener('device:assigned', handleDeviceUpdate);
    window.addEventListener('device:updated', handleDeviceUpdate);
    window.addEventListener('device:removed', handleDeviceUpdate);

    return () => {
      window.removeEventListener('device:assigned', handleDeviceUpdate);
      window.removeEventListener('device:updated', handleDeviceUpdate);
      window.removeEventListener('device:removed', handleDeviceUpdate);
    };
  }, [fetchDevices]);

  return {
    data: devices,
    isLoading: loading,
    error,
    refetch: fetchDevices
  };
}

// Export mutation hooks - These DON'T use the main hook
// Instead, they import services directly to avoid Rules of Hooks violations
export function useCreateParty() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthStore();

  const mutateAsync = useCallback(async (data: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Super Admin Tenant Check
    if (user?.role === 'super_admin' && !user.tenantId) {
      const msg = "Lütfen işlem yapmak için bir klinik (tenant) seçiniz.";
      // Toast notification should be handled by UI layer, but we throw error to block
      throw new Error(msg);
    }

    setIsPending(true);
    setError(null);
    try {
      const result = await partyService.createParty(data);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create party');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [user]);

  return { mutateAsync, isPending, isError: !!error, error };
}

export function useUpdateParty() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthStore();

  // Relaxed signature to accept PartyCreate structures or flexible updates
  const mutateAsync = useCallback(async ({ partyId, updates }: { partyId: string; updates: Partial<Party> | Record<string, unknown> }) => {
    // Super Admin Tenant Check
    if (user?.role === 'super_admin' && !user.tenantId) {
      throw new Error("Lütfen işlem yapmak için bir klinik (tenant) seçiniz.");
    }

    setIsPending(true);
    setError(null);
    try {
      // API expects correct structure, assume caller handled it or service will validate
      const result = await partyService.updateParty(partyId, updates as Partial<Party>);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update party');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [user]);

  return { mutateAsync, isPending, isError: !!error, error };
}

export function useDeleteParty() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthStore();

  const mutateAsync = useCallback(async (partyId: string) => {
    // Super Admin Tenant Check
    if (user?.role === 'super_admin' && !user.tenantId) {
      throw new Error("Lütfen işlem yapmak için bir klinik (tenant) seçiniz.");
    }

    setIsPending(true);
    setError(null);
    try {
      await partyService.deleteParty(partyId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete party');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [user]);

  return { mutateAsync, isPending, isError: !!error, error };
}