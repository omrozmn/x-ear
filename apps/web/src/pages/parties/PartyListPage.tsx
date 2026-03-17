import React, { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useParties } from '../../hooks/useParties';
import { usePartyMutations } from '../../hooks/party/usePartyMutations';
import { Party } from '../../types/party';
import { PartySegment, PartyLabel } from '../../types/party/party-base.types';
import { PartyStatus } from '../../generated/orval-types';
import { PartySearchItem, PartyFilters as PartyFiltersType } from '../../types/party/party-search.types';
import { PartyCard } from '../../components/parties/PartyCard';
import { PartySearch } from '../../components/parties/PartySearch';
import { PartyFilters } from '../../components/parties/PartyFilters';
import { PartyFormModal } from '../../components/parties/PartyFormModal';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '@x-ear/ui-web';
import type { PartyCreate } from '@/api/generated/schemas';

interface PartyCreateRequest {
  firstName: string;
  lastName: string;
  phone: string;
  tcNumber?: string;
  birthDate?: string;
  email?: string;
  address?: string;
  addressFull?: string;
  status?: string;
  segment?: string;
  label?: string;
  acquisitionType?: string;
  tags?: string[];
  customData?: Record<string, unknown>;
}

interface PartyListPageProps {
  className?: string;
}

/**
 * PartyListPage Component
 * Main page for displaying and managing party list with offline-first approach
 * Follows 500 LOC limit and single responsibility principle
 */
export function PartyListPage({ className = '' }: PartyListPageProps) {
  // Hooks
  const navigate = useNavigate();
  const partiesQuery = useParties();
  const {
    data: partiesData,
    isLoading: loading,
    error,
    refetch: refresh
  } = partiesQuery;

  const {
    createParty,
    updateParty,
    deleteParty,
    loading: mutationLoading,
    error: mutationError,
    isOnline,
    clearError: clearMutationError
  } = usePartyMutations();
  const { hasPermission } = usePermissions();
  const canViewListContact = hasPermission('sensitive.parties.list.contact.view');
  const canViewListIdentity = hasPermission('sensitive.parties.list.identity.view');

  // Extract data from query result
  const parties = partiesData?.parties || [];
  const totalCount = partiesData?.total || 0;
  const hasMore = partiesData?.hasMore || false;

  // Local state for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PartyFiltersType>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Computed pagination
  const pagination = {
    page: currentPage,
    pageSize: 20,
    total: totalCount,
    hasMore
  };

  // Handlers
  const loadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore]);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
  }, []);

  // Helper function to convert Party to PartySearchItem
  const convertToSearchItem = useCallback((party: Party): PartySearchItem => ({
    id: party.id || '',
    firstName: party.firstName || '',
    lastName: party.lastName || '',
    tcNumber: canViewListIdentity
      ? (party.tcNumber || party.tc_number || '')
      : 'Bu rol icin gizli',
    phone: canViewListContact
      ? (party.phone || '')
      : 'Bu rol icin gizli',
    email: canViewListContact
      ? (party.email || '')
      : 'Bu rol icin gizli',
    status: (party.status as PartyStatus) || 'active',
    segment: (party.segment as PartySegment) || 'NEW',
    labels: party.label ? [party.label as PartyLabel] : [],
    registrationDate: party.createdAt || party.created_at || '',
    lastVisitDate: party.updatedAt || party.updated_at || '',
    deviceCount: party.devices?.length || 0,
    hasInsurance: !!(party.sgkInfo || party.sgk_info),
    outstandingBalance: 0,
    priority: party.priorityScore || party.priority_score || 0
  }), [canViewListContact, canViewListIdentity]);
  const [selectedParties, setSelectedParties] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Computed values
  const hasSelectedParties = selectedParties.size > 0;
  const isLoading = loading || mutationLoading;
  const currentError = error || mutationError;

  // Handlers
  const handleSelectParty = useCallback((partyId: string, selected: boolean) => {
    setSelectedParties(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(partyId);
      } else {
        newSet.delete(partyId);
      }
      return newSet;
    });
  }, []);

  const handleCreateParty = useCallback(async (partyData: PartyCreate) => {
    const result = await createParty(partyData as unknown as PartyCreateRequest, {
      onSuccess: () => {
        setShowCreateModal(false);
        refresh();
      },
      onError: (error) => {
        console.error('Failed to create party:', error);
      }
    });
    return result;
  }, [createParty, refresh]);

  const handleUpdateParty = useCallback(async (partyId: string, updates: PartyCreate) => {
    const result = await updateParty(partyId, updates as unknown as Record<string, unknown>, {
      onSuccess: () => {
        setEditingParty(null);
        refresh();
      },
      onError: (error) => {
        console.error('Failed to update party:', error);
      }
    });
    return result;
  }, [updateParty, refresh]);

  const handleDeleteParty = useCallback(async (partyId: string) => {
    if (!confirm('Bu hastayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    await deleteParty(partyId, {
      onSuccess: () => {
        setSelectedParties(prev => {
          const newSet = new Set(prev);
          newSet.delete(partyId);
          return newSet;
        });
        refresh();
      },
      onError: (error) => {
        console.error('Failed to delete party:', error);
      }
    });
  }, [deleteParty, refresh]);

  const handlePartyClick = useCallback((party: PartySearchItem) => {
    navigate({
      to: '/parties/$partyId',
      params: { partyId: party.id }
    });
  }, [navigate]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`${selectedParties.size} hastayı silmek istediğinizden emin misiniz?`)) {
      return;
    }

    const promises = Array.from(selectedParties).map(partyId =>
      deleteParty(partyId)
    );

    await Promise.allSettled(promises);
    setSelectedParties(new Set());
    refresh();
  }, [selectedParties, deleteParty, refresh]);

  const clearError = useCallback(() => {
    // Clear query error by refetching
    refresh();
    clearMutationError();
  }, [refresh, clearMutationError]);

  const handleRefresh = useCallback(() => {
    clearError();
    clearMutationError();
    refresh();
  }, [clearError, clearMutationError, refresh]);

  // Render helpers
  const renderHeader = () => (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            Hastalar ({parties.length})
          </h1>
          {!isOnline && (
            <span className="px-2 py-1 text-xs bg-warning/10 text-yellow-800 rounded-full">
              Çevrimdışı
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            variant="ghost"
            size="sm"
            title={`${viewMode === 'grid' ? 'Liste' : 'Kart'} görünümüne geç`}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </Button>

          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Yenileniyor...' : 'Yenile'}
          </Button>

          <Button
            onClick={() => setShowCreateModal(true)}
            data-testid="party-create-button"
          >
            Yeni Hasta
          </Button>
        </div>
      </div>

      {hasSelectedParties && (
        <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-2xl">
          <span className="text-sm text-primary">
            {selectedParties.size} hasta seçildi
          </span>
          <Button
            onClick={handleBulkDelete}
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Seçilenleri Sil
          </Button>
          <Button
            onClick={() => setSelectedParties(new Set())}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Seçimi Temizle
          </Button>
        </div>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className="flex flex-col gap-4 mb-6">
      <PartySearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Hasta ara (isim, telefon, TC)..."
        className="flex-1"
      />

      <PartyFilters
        filters={filters}
        onChange={setFilters}
        onClearFilters={clearFilters}
        partyCount={totalCount}
      />
    </div>
  );

  const renderPartyList = () => {
    if (parties.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Arama kriterlerine uygun hasta bulunamadı'
              : 'Henüz hasta eklenmemiş'
            }
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Farklı arama terimleri veya filtreler deneyin'
              : 'İlk hastanızı ekleyerek başlayın'
            }
          </p>
          {!searchTerm && Object.keys(filters).length === 0 && (
            <Button
              onClick={() => setShowCreateModal(true)}
              data-testid="party-create-button-empty-state"
            >
              Yeni Hasta Ekle
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className={`
        ${viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          : 'space-y-2'
        }
      `}>
        {parties.map((party) => (
          <PartyCard
            key={party.id}
            party={convertToSearchItem(party)}
            selected={party.id ? selectedParties.has(party.id) : false}
            onSelect={(partyId) => handleSelectParty(partyId, !selectedParties.has(partyId))}
            onClick={handlePartyClick}
            onEdit={() => setEditingParty(party)}
            onDelete={() => party.id && handleDeleteParty(party.id)}
            showSelection={true}
            className="hover:shadow-md transition-shadow"
          />
        ))}
      </div>
    );
  };

  const renderLoadMore = () => {
    if (!pagination.hasMore) return null;

    return (
      <div className="text-center mt-8">
        <Button
          onClick={loadMore}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Yükleniyor...' : 'Daha Fazla Göster'}
        </Button>
      </div>
    );
  };

  const renderError = () => {
    if (!currentError) return null;

    return (
      <div className="mb-6 p-4 bg-destructive/10 border border-red-200 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-destructive mr-2">⚠️</span>
            <span className="text-sm text-destructive">{typeof currentError === 'string' ? currentError : (currentError as Error)?.message || String(currentError)}</span>
          </div>
          <Button
            onClick={() => {
              clearError();
              clearMutationError();
            }}
            variant="ghost"
            size="sm"
          >
            ✕
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-muted p-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {renderHeader()}
        {renderError()}
        {renderFilters()}
        {renderPartyList()}
        {renderLoadMore()}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <PartyFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateParty}
          title="Yeni Hasta Ekle"
        />
      )}

      {editingParty && (
        <PartyFormModal
          isOpen={!!editingParty}
          onClose={() => setEditingParty(null)}
          onSubmit={(data) => handleUpdateParty(editingParty.id || '', data)}
          initialData={editingParty}
          title="Hasta Düzenle"
        />
      )}
    </div>
  );
}
