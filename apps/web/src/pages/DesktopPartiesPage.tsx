/**
 * PartiesPage Component
 * @fileoverview Main parties management page with search, filters, and party list
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Button, Input, Modal, Pagination } from '@x-ear/ui-web';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useParties, useCreateParty, useDeleteParty } from '../hooks/useParties';
import { Party } from '../types/party';
import { Users, CheckCircle, Flame, Headphones, Filter, Search, Plus, RefreshCw, Upload, Trash2, Settings } from 'lucide-react';
import { PartyFormModal } from '../components/parties/PartyFormModal';
import { useUpdateParty } from '../hooks/useParties';
import { PartyFilters } from '../components/parties/PartyFilters';
import { PartyList } from '../components/parties/PartyList';
// import { PartyCSVUpload } from '../components/parties/csv/PartyCSVUpload'; // UniversalImporter is used instead
import UniversalImporter from '../components/importer/UniversalImporter';
import { useToastHelpers, Card } from '@x-ear/ui-web';
import partiesSchema from '../components/importer/schemas/parties';
import { PartyFilters as PartyFiltersType } from '../types/party/party-search.types';
import { PartyStatus, PartySegment, PartyLabel } from '../types/party/party-base.types';
import { PartyTagUpdateModal } from '../components/parties/PartyTagUpdateModal';



export function DesktopPartiesPage() {
  const { success: showSuccess, error: showError } = useToastHelpers();
  const navigate = useNavigate();
  useParams({ strict: false });

  // State
  const [searchValue, setSearchValue] = useState('');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [showNewPartyModal, setShowNewPartyModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [filters, setFilters] = useState<PartyFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tagUpdateParty, setTagUpdateParty] = useState<Party | null>(null);

  // Hooks
  const { data, isLoading, error } = useParties();
  const parties = data?.parties || [];
  const updatePartyMutation = useUpdateParty();
  const createPartyMutation = useCreateParty();
  const deletePartyMutation = useDeleteParty();

  // Mock stats for now
  const stats = {
    total: (parties?.length || 0),
    active: parties.filter(p => p.status === 'ACTIVE').length,
    inactive: parties.filter(p => p.status === 'INACTIVE').length,
    withDevices: 0
  };

  // Handlers
  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const handleRefresh = () => {
    // refetch is not available in this hook, we'll use a different approach
    window.location.reload();
  };

  const handleNewParty = () => {
    setShowNewPartyModal(true);
  };

  const handleEditParty = (party: Party) => {
    setEditingParty(party);
    setIsEditModalOpen(true);
  };

  const handlePartySelect = (partyId: string) => {
    setSelectedParties(prev => {
      if (prev.includes(partyId)) {
        return prev.filter(id => id !== partyId);
      } else {
        return [...prev, partyId];
      }
    });
  };

  const handlePartyClick = (party: Party) => {
    if (party.id) {
      navigate({
        to: '/parties/$partyId',
        params: { partyId: String(party.id) }
      });
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchValue('');
  };

  /*
  const handleCSVUpload = async (file: File) => {
    // TODO: Implement CSV upload logic
    setShowCSVModal(false);
  };
  */

  const handleDeleteParty = (party: Party) => {
    setPartyToDelete(party);
  };

  const confirmDelete = async () => {
    if (!partyToDelete?.id) return;
    try {
      await deletePartyMutation.mutateAsync(partyToDelete.id);
      setPartyToDelete(null);
    } catch (error) {
      console.error('Failed to delete party:', error);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleTagUpdate = async (partyId: string, updates: { tags?: string[]; status?: PartyStatus; segment?: PartySegment; acquisitionType?: string; branchId?: string }) => {
    try {
      // Clean up updates object to remove undefined fields if needed, or simply pass
      await updatePartyMutation.mutateAsync({ partyId, updates: updates as Partial<Party> });
      setTagUpdateParty(null);
    } catch (error) {
      console.error('Failed to update party tags:', error);
      throw error;
    }
  };

  // Filtered parties based on search and filters
  const filteredParties = parties.filter(party => {
    // Search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = (
        (party.firstName || '').toLowerCase().includes(searchLower) ||
        (party.lastName || '').toLowerCase().includes(searchLower) ||
        (party.phone || '').toLowerCase().includes(searchLower) ||
        (party.tcNumber || '').toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(party.status as PartyStatus)) return false;
    }

    // Segment filter
    if (filters.segment && filters.segment.length > 0) {
      if (!filters.segment.includes(party.segment as PartySegment)) return false;
    }

    // Acquisition Type filter
    if (filters.acquisitionType && filters.acquisitionType.length > 0) {
      if (!party.acquisitionType || !filters.acquisitionType.includes(party.acquisitionType)) return false;
    }

    // Labels filter
    if (filters.labels && filters.labels.length > 0) {
      const labels = party.labels || [];
      if (!labels.some((l) => filters.labels!.includes(l as PartyLabel))) return false;
    }

    // Branch filter
    if (filters.branchId && party.branchId !== filters.branchId) return false;

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const partyTags = party.tags || [];
      if (!filters.tags.every(t => partyTags.includes(t))) return false;
    }

    return true;
  });

  // Sorted parties
  const sortedParties = [...filteredParties].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'name':
        aValue = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        bValue = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        break;
      case 'createdAt':
        aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginated parties
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParties = sortedParties.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hastalar</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Hasta kayıtlarını yönetin</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Navigate to settings page with parties tab active
                alert('TODO: Ayarlar sayfasında hastalar sekmesi açılacak');
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Hasta Ayarları
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCSVModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Toplu Yükle
            </Button>
            <Button onClick={handleNewParty}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Hasta
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aktif</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pasif</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.inactive}</p>
              </div>
              <Flame className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cihazlı</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.withDevices}</p>
              </div>
              <Headphones className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Ad, soyad, telefon veya TC ile ara..."
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtreler
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <PartyFilters
              filters={filters}
              onChange={setFilters}
              onClearFilters={handleClearFilters}
              partyCount={sortedParties.length}
              loading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Party List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Yükleniyor...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-sm text-red-600">Bir hata oluştu</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Tekrar Dene
              </Button>
            </div>
          </div>
        ) : sortedParties.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Hasta bulunamadı</p>
              <Button variant="outline" size="sm" onClick={handleNewParty} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Hasta Ekle
              </Button>
            </div>
          </div>
        ) : (
          <>
            <PartyList
              parties={paginatedParties}
              onEdit={handleEditParty}
              onPartyClick={handlePartyClick}
              onDelete={handleDeleteParty}
              onPartySelect={handlePartySelect}
              selectedParties={selectedParties}
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onTagClick={setTagUpdateParty}
              showSelection={selectedParties.length > 0}
              showActions={true}
            />
            <div className="border-t border-gray-200 p-4">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(sortedParties.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(newSize) => {
                  setItemsPerPage(newSize);
                  setCurrentPage(1);
                }}
                totalItems={sortedParties.length}
              />
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <PartyFormModal
        isOpen={showNewPartyModal}
        onClose={() => setShowNewPartyModal(false)}
        onSubmit={async (data) => {
          try {
            const result = await createPartyMutation.mutateAsync(data as unknown as Omit<Party, 'id' | 'createdAt' | 'updatedAt'>);
            setShowNewPartyModal(false);
            return result;
          } catch (e) {
            console.error('Failed to create party', e);
            throw e;
          }
        }}
        title="Yeni Hasta"
        isLoading={createPartyMutation.isPending}
      />

      {/* Edit Modal */}
      <PartyFormModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingParty(null); }}
        onSubmit={async (updates) => {
          try {
            if (!editingParty?.id) return null;
            await updatePartyMutation.mutateAsync({
              partyId: editingParty.id,
              updates: updates as Partial<Party>,
            });
            setIsEditModalOpen(false);
            setEditingParty(null);
            return editingParty;
          } catch (e) {
            console.error('Failed to update party', e);
            throw e;
          }
        }}
        initialData={editingParty || undefined}
        title="Hasta Düzenle"
        isLoading={updatePartyMutation.isPending}
      />

      {/* Tag Update Modal */}
      <PartyTagUpdateModal
        isOpen={!!tagUpdateParty}
        onClose={() => setTagUpdateParty(null)}
        party={tagUpdateParty}
        onUpdate={handleTagUpdate}
      />

      {/* CSV Upload Modal (now shared UniversalImporter with mapping + preview) */}
      <UniversalImporter
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        entityFields={[
          { key: 'firstName', label: 'Ad' },
          { key: 'lastName', label: 'Soyad' },
          { key: 'tcNumber', label: 'TC Kimlik No' },
          { key: 'phone', label: 'Telefon' },
          { key: 'email', label: 'E-posta' },
          { key: 'birthDate', label: 'Doğum Tarihi' },
          { key: 'gender', label: 'Cinsiyet' }
        ]}
        zodSchema={partiesSchema}
        uploadEndpoint={'/api/parties/bulk_upload'}
        modalTitle={'Toplu Hasta Yükleme'}
        sampleDownloadUrl={'/import_samples/parties_sample.csv'}
        onComplete={(res) => {
          if (res.errors && res.errors.length > 0) {
            showError(`Hasta import tamamlandı — Hatalı satır: ${res.errors.length}`);
          } else {
            showSuccess(`Hasta import tamamlandı — Oluşturulan: ${res.created}`);
          }
          // refresh page data simply
          handleRefresh();
          setShowCSVModal(false);
        }}
      />
      {/* Import result card */}
      {/* Note: show a small summary card after import */}
      {false && (
        <div className="mt-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Oluşturulan: <strong>0</strong></div>
                <div className="text-sm">Güncellenen: <strong>0</strong></div>
                <div className="text-sm">Hatalı satır: <strong>0</strong></div>
              </div>
              <div>
                <Button variant="outline">Kapat</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!partyToDelete}
        onClose={() => setPartyToDelete(null)}
        title="Hastayı Sil"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">
                Bu hastayı silmek istediğinizden emin misiniz?
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {partyToDelete?.firstName} {partyToDelete?.lastName}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Bu işlem geri alınamaz. Hasta kaydı ve tüm ilişkili veriler silinecektir.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPartyToDelete(null)}>İptal</Button>
            <Button variant="danger" onClick={confirmDelete}>Sil</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}