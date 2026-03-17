/**
 * PartiesPage Component
 * @fileoverview Main parties management page with search, filters, and party list
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { Button, Input, Modal, Textarea, FieldWrapper, VStack } from '@x-ear/ui-web';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useParties, useCreateParty, useDeleteParty, useUpdateParty } from '../hooks/useParties';
import { Party } from '../types/party';
import { Users, CheckCircle, Flame, Filter, Search, Plus, RefreshCw, Upload, Trash2, Settings, Download, MessageSquare, Mail, Phone, Send, X, AlertTriangle } from 'lucide-react';
import { PartyFormModal } from '../components/parties/PartyFormModal';
import { PartyFilters } from '../components/parties/PartyFilters';
import { PartyList } from '../components/parties/PartyList';
import UniversalImporter from '../components/importer/UniversalImporter';
import { useToastHelpers, Card } from '@x-ear/ui-web';
import partiesSchema from '../components/importer/schemas/parties';
import { PartyFilters as PartyFiltersType } from '../types/party/party-search.types';
import { PartyStatus, PartySegment, PartyLabel } from '../types/party/party-base.types';
import { PartyTagUpdateModal } from '../components/parties/PartyTagUpdateModal';
import NoahImportModal from '../components/noah/NoahImportModal';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { useFeatures } from '../hooks/useFeatures';
import { useGetWhatsAppSessionStatus } from '../api/generated/whats-app/whats-app';
import { useListSmConfig, useListSmCredit } from '../api/generated/sms-integration/sms-integration';
import { useCreateCommunicationMessageSendSms, useCreateCommunicationMessageSendEmail } from '../api/generated/communications/communications';
import { useCreateWhatsAppSendBulk } from '../api/generated/whats-app/whats-app';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';



export function DesktopPartiesPage() {
  const { success: showSuccess, error: showError } = useToastHelpers();
  const navigate = useNavigate();
  useParams({ strict: false });

  // State
  const [searchValue, setSearchValue] = useState('');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [showNewPartyModal, setShowNewPartyModal] = useState(false);
  const [filters, setFilters] = useState<PartyFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tagUpdateParty, setTagUpdateParty] = useState<Party | null>(null);
  const [showNoahImport, setShowNoahImport] = useState(false);
  const [bulkMessageModal, setBulkMessageModal] = useState<'sms' | 'whatsapp' | 'email' | null>(null);
  const [bulkMessageText, setBulkMessageText] = useState('');
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [confirmDeleteBulk, setConfirmDeleteBulk] = useState(false);

  // Hooks
  const { data, isLoading, error, refetch } = useParties();
  const parties = data?.parties || [];
  const createPartyMutation = useCreateParty();
  const deletePartyMutation = useDeleteParty();

  // Communication service checks
  const { isFeatureEnabled } = useFeatures();
  const campaignsEnabled = isFeatureEnabled('campaigns');
  const { data: waStatus } = useGetWhatsAppSessionStatus({ query: { enabled: campaignsEnabled } });
  const { data: smsConfig } = useListSmConfig({ query: { enabled: campaignsEnabled } });
  const { data: smsCredit } = useListSmCredit({ query: { enabled: campaignsEnabled } });
  const whatsappConnected = (waStatus as unknown as { status?: string })?.status === 'connected';
  const smsActive = !!(smsConfig as unknown as { provider?: string })?.provider;
  const smsCredits = (smsCredit as unknown as { data?: { credit?: number } })?.data?.credit ?? 0;
  const emailActive = campaignsEnabled; // Email typically available if campaigns feature is on

  // Bulk send mutations
  const sendSmsMutation = useCreateCommunicationMessageSendSms();
  const sendEmailMutation = useCreateCommunicationMessageSendEmail();
  const sendWhatsAppBulkMutation = useCreateWhatsAppSendBulk();

  // Selected parties data
  const selectedPartiesData = useMemo(() =>
    parties.filter(p => selectedParties.includes(p.id || '')),
    [parties, selectedParties]
  );

  // Tag update mutation
  const updatePartyMutation = useUpdateParty();

  // Handlers
  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleNewParty = () => {
    setShowNewPartyModal(true);
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
      await updatePartyMutation.mutateAsync({ 
        partyId, 
        updates
      });
      // Wait for refetch to complete before closing modal
      await refetch();
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

    // Status filter - case insensitive and typo-resistant comparison
    if (filters.status && filters.status.length > 0) {
      const normalizeStatus = (status: string) => {
        return String(status || '')
          .toUpperCase()
          .trim()
          .replace(/[İI]/g, 'I') // Turkish I normalization
          .replace(/Ş/g, 'S')
          .replace(/Ğ/g, 'G')
          .replace(/Ü/g, 'U')
          .replace(/Ö/g, 'O')
          .replace(/Ç/g, 'C');
      };
      
      const partyStatus = normalizeStatus(party.status ? String(party.status) : '');
      const filterStatuses = filters.status.map(s => normalizeStatus(String(s || '')));
      if (!filterStatuses.includes(partyStatus)) return false;
    }

    // Segment filter - case insensitive and typo-resistant comparison
    if (filters.segment && filters.segment.length > 0) {
      const normalizeSegment = (segment: string) => {
        return String(segment || '')
          .toUpperCase()
          .trim()
          .replace(/[İI]/g, 'I')
          .replace(/Ş/g, 'S')
          .replace(/Ğ/g, 'G')
          .replace(/Ü/g, 'U')
          .replace(/Ö/g, 'O')
          .replace(/Ç/g, 'C');
      };
      
      const partySegment = normalizeSegment(party.segment || '');
      const filterSegments = filters.segment.map(s => normalizeSegment(s));
      if (!filterSegments.includes(partySegment)) return false;
    }

    // Acquisition Type filter - case insensitive and typo-resistant comparison
    if (filters.acquisitionType && filters.acquisitionType.length > 0) {
      const normalizeAcquisition = (acq: string) => {
        return String(acq || '')
          .toLowerCase()
          .trim()
          .replace(/[ıi]/g, 'i')
          .replace(/ş/g, 's')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/\s+/g, '-') // spaces to dashes
          .replace(/_/g, '-'); // underscores to dashes
      };
      
      const partyAcquisition = normalizeAcquisition(party.acquisitionType || '');
      const filterAcquisitions = filters.acquisitionType.map(a => normalizeAcquisition(a));
      if (!partyAcquisition || !filterAcquisitions.includes(partyAcquisition)) return false;
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

    // Date range filter (registrationDateRange)
    if (filters.registrationDateRange) {
      const { start, end } = filters.registrationDateRange;
      if (party.createdAt) {
        const partyDate = new Date(party.createdAt);
        if (start) {
          const startDate = new Date(start);
          if (partyDate < startDate) return false;
        }
        if (end) {
          const endDate = new Date(end);
          endDate.setHours(23, 59, 59, 999); // Include the entire end date
          if (partyDate > endDate) return false;
        }
      }
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
      case 'status':
        aValue = (a.status || '').toLowerCase();
        bValue = (b.status || '').toLowerCase();
        break;
      case 'segment':
        aValue = (a.segment || '').toLowerCase();
        bValue = (b.segment || '').toLowerCase();
        break;
      case 'acquisitionType':
        aValue = (a.acquisitionType || '').toLowerCase();
        bValue = (b.acquisitionType || '').toLowerCase();
        break;
      case 'branchId':
        aValue = (a.branchId || '').toLowerCase();
        bValue = (b.branchId || '').toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Stats based on FILTERED parties (updates dynamically with filters)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const stats = {
    total: filteredParties.length,
    active: filteredParties.filter(p => {
      const status = String(p.status || '').toUpperCase();
      return status === 'ACTIVE';
    }).length,
    inactive: filteredParties.filter(p => {
      const status = String(p.status || '').toUpperCase();
      return status === 'INACTIVE';
    }).length,
    newThisMonth: filteredParties.filter(p => {
      if (!p.createdAt) return false;
      const createdDate = new Date(p.createdAt);
      return createdDate >= thirtyDaysAgo;
    }).length
  };

  // Paginated parties
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParties = sortedParties.slice(startIndex, endIndex);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <DesktopPageHeader
          className="mb-4"
          title="Hastalar"
          description="Hasta kayıtlarını yönetin"
          icon={<Users className="h-6 w-6" />}
          eyebrow={{ tr: 'Hasta Yönetimi', en: 'Patient Hub' }}
          actions={(
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Yenile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate({ to: '/settings/parties' });
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Hasta Ayarları
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCSVModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Toplu Yükle
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowNoahImport(true)}>
                <Download className="h-4 w-4 mr-2" />
                Noah'tan İçe Aktar
              </Button>
              <Button onClick={handleNewParty}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Hasta
              </Button>
            </>
          )}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktif</p>
                <p className="text-2xl font-bold text-success">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pasif</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
              </div>
              <Flame className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Yeni (30 Gün)</p>
                <p className="text-2xl font-bold text-primary">{stats.newThisMonth}</p>
              </div>
              <Flame className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <div className="mt-4 pt-4 border-t border-border">
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-border">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-sm text-destructive">Bir hata oluştu</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Tekrar Dene
              </Button>
            </div>
          </div>
        ) : sortedParties.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Hasta bulunamadı</p>
              <Button variant="outline" size="sm" onClick={handleNewParty} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Hasta Ekle
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Bulk Action Bar */}
            {selectedParties.length > 0 && (
              <div className="mb-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-primary">{selectedParties.length} hasta secildi</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedParties([])} className="text-xs text-muted-foreground h-7">
                      <X className="h-3 w-3 mr-1" /> Temizle
                    </Button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* SMS */}
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setBulkMessageModal('sms')}
                    disabled={!campaignsEnabled || !smsActive}
                    title={!campaignsEnabled ? 'Kampanya modulu paketinize dahil degil' : !smsActive ? 'SMS servisi aktif degil (Ayarlar > Entegrasyonlar)' : `SMS gonder (${smsCredits} kredi)`}
                    className="gap-1.5"
                  >
                    <Phone className="h-4 w-4" />
                    SMS
                    {smsActive && smsCredits > 0 && <span className="text-[10px] text-muted-foreground">({smsCredits})</span>}
                    {!smsActive && <span className="text-[10px] text-destructive">kapal??</span>}
                  </Button>

                  {/* WhatsApp */}
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setBulkMessageModal('whatsapp')}
                    disabled={!campaignsEnabled || !whatsappConnected}
                    title={!campaignsEnabled ? 'Kampanya modulu paketinize dahil degil' : !whatsappConnected ? 'WhatsApp bagli degil (Ayarlar > Entegrasyonlar)' : 'WhatsApp mesaj gonder'}
                    className="gap-1.5"
                  >
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                    {whatsappConnected && <span className="w-2 h-2 bg-success rounded-full" />}
                    {!whatsappConnected && <span className="text-[10px] text-destructive">baglanti yok</span>}
                  </Button>

                  {/* Email */}
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setBulkMessageModal('email')}
                    disabled={!campaignsEnabled || !emailActive}
                    title={!campaignsEnabled ? 'Kampanya modulu paketinize dahil degil' : 'E-posta gonder'}
                    className="gap-1.5"
                  >
                    <Mail className="h-4 w-4" />
                    E-posta
                  </Button>

                  <div className="w-px h-6 bg-border mx-1" />

                  {/* Export */}
                  <Button variant="outline" size="sm" onClick={() => {
                    const csvContent = selectedPartiesData
                      .map(p => `${p.firstName},${p.lastName},${p.phone || ''},${p.email || ''},${p.tcNumber || ''}`)
                      .join('\n');
                    const blob = new Blob([`Ad,Soyad,Telefon,Email,TC\n${csvContent}`], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'hastalar.csv'; a.click();
                    URL.revokeObjectURL(url);
                    showSuccess('CSV indirildi');
                  }} className="gap-1.5">
                    <Download className="h-4 w-4" /> Disari Aktar
                  </Button>

                  {/* Tag Update */}
                  <Button variant="outline" size="sm" onClick={() => {
                    setTagUpdateParty(selectedPartiesData[0] || null);
                  }} className="gap-1.5">
                    <Settings className="h-4 w-4" /> Etiket
                  </Button>

                  {/* Delete */}
                  <Button variant="danger" size="sm" onClick={() => setConfirmDeleteBulk(true)} className="gap-1.5">
                    <Trash2 className="h-4 w-4" /> Sil ({selectedParties.length})
                  </Button>
                </div>
              </div>
            )}

            {/* Bulk Message Modal */}
            {bulkMessageModal && (
              <Modal isOpen={true} onClose={() => { setBulkMessageModal(null); setBulkMessageText(''); setBulkEmailSubject(''); }}
                title={bulkMessageModal === 'sms' ? `SMS Gonder` : bulkMessageModal === 'whatsapp' ? `WhatsApp Mesaj` : `E-posta Gonder`}
                size="lg"
              >
                <VStack spacing={5}>
                  {/* Header with icon and count */}
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bulkMessageModal === 'sms' ? 'bg-primary/10 text-primary' : bulkMessageModal === 'whatsapp' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'}`}>
                      {bulkMessageModal === 'sms' ? <Phone className="h-5 w-5" /> : bulkMessageModal === 'whatsapp' ? <MessageSquare className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {selectedParties.length} hastaya {bulkMessageModal === 'sms' ? 'SMS' : bulkMessageModal === 'whatsapp' ? 'WhatsApp mesaji' : 'e-posta'} gonder
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {bulkMessageModal !== 'email'
                          ? `${selectedPartiesData.filter(p => p.phone).length} hastanin telefon numarasi mevcut`
                          : `${selectedPartiesData.filter(p => p.email).length} hastanin e-posta adresi mevcut`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Credit warning for SMS */}
                  {bulkMessageModal === 'sms' && smsCredits < selectedParties.length && (
                    <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-xl text-sm text-foreground">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      <span>Yetersiz SMS kredisi. Mevcut: <strong>{smsCredits}</strong>, Gerekli: <strong>{selectedParties.length}</strong></span>
                    </div>
                  )}

                  {/* Recipients */}
                  <FieldWrapper label="Alicilar" hint={
                    bulkMessageModal !== 'email'
                      ? `${selectedPartiesData.filter(p => !p.phone).length} hastanin telefonu yok, atlanacak`
                      : `${selectedPartiesData.filter(p => !p.email).length} hastanin e-postasi yok, atlanacak`
                  }>
                    <div className="p-3 bg-muted/50 border border-border rounded-xl max-h-24 overflow-y-auto">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPartiesData.slice(0, 8).map(p => (
                          <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded-full text-xs text-foreground">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {p.firstName} {p.lastName}
                          </span>
                        ))}
                        {selectedPartiesData.length > 8 && (
                          <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                            +{selectedPartiesData.length - 8} daha
                          </span>
                        )}
                      </div>
                    </div>
                  </FieldWrapper>

                  {/* Email subject */}
                  {bulkMessageModal === 'email' && (
                    <FieldWrapper label="Konu" required>
                      <Input
                        placeholder="E-posta konusunu yazin..."
                        value={bulkEmailSubject}
                        onChange={(e) => setBulkEmailSubject(e.target.value)}
                        className="w-full"
                      />
                    </FieldWrapper>
                  )}

                  {/* Message body */}
                  <FieldWrapper
                    label={bulkMessageModal === 'sms' ? 'SMS Metni' : bulkMessageModal === 'whatsapp' ? 'Mesaj' : 'E-posta Icerigi'}
                    required
                    hint={bulkMessageModal === 'sms'
                      ? `${bulkMessageText.length} karakter / ${Math.ceil(bulkMessageText.length / 155) || 1} segment — Tahmini: ${(Math.ceil(bulkMessageText.length / 155) || 1) * selectedPartiesData.filter(p => p.phone).length} kredi`
                      : undefined
                    }
                  >
                    <Textarea
                      placeholder={
                        bulkMessageModal === 'sms' ? 'Merhaba {{AD}}, randevunuz...'
                        : bulkMessageModal === 'whatsapp' ? 'Merhaba, size X-EAR olarak ulasmak istedik...'
                        : 'E-posta icerigini buraya yazin...'
                      }
                      value={bulkMessageText}
                      onChange={(e) => setBulkMessageText(e.target.value)}
                      rows={bulkMessageModal === 'email' ? 8 : 5}
                      className="w-full"
                    />
                  </FieldWrapper>

                  {/* Footer actions */}
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                    <Button variant="ghost" size="md" onClick={() => { setBulkMessageModal(null); setBulkMessageText(''); setBulkEmailSubject(''); }}>
                      Iptal
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      icon={<Send className="h-4 w-4" />}
                      disabled={!bulkMessageText.trim() || bulkSending || (bulkMessageModal === 'email' && !bulkEmailSubject.trim())}
                      onClick={async () => {
                        setBulkSending(true);
                        try {
                          let sent = 0;
                          let failed = 0;

                          if (bulkMessageModal === 'sms') {
                            for (const p of selectedPartiesData) {
                              if (!p.phone) { failed++; continue; }
                              try {
                                await sendSmsMutation.mutateAsync({ data: { phoneNumber: p.phone, message: bulkMessageText, partyId: p.id } });
                                sent++;
                              } catch { failed++; }
                            }
                          } else if (bulkMessageModal === 'whatsapp') {
                            try {
                              await sendWhatsAppBulkMutation.mutateAsync({
                                data: {
                                  message: bulkMessageText,
                                  partyIds: selectedParties,
                                }
                              });
                              sent = selectedPartiesData.filter(p => p.phone).length;
                            } catch { failed = selectedParties.length; }
                          } else if (bulkMessageModal === 'email') {
                            for (const p of selectedPartiesData) {
                              if (!p.email) { failed++; continue; }
                              try {
                                await sendEmailMutation.mutateAsync({ data: { toEmail: p.email, subject: bulkEmailSubject, bodyText: bulkMessageText, partyId: p.id } });
                                sent++;
                              } catch { failed++; }
                            }
                          }

                          if (sent > 0) showSuccess(`${sent} mesaj gonderildi${failed > 0 ? `, ${failed} basarisiz` : ''}`);
                          else showError('Mesaj gonderilemedi');

                          setBulkMessageModal(null);
                          setBulkMessageText('');
                          setBulkEmailSubject('');
                        } catch (e) {
                          showError('Toplu gonderim hatasi');
                        } finally {
                          setBulkSending(false);
                        }
                      }}
                    >
                      {bulkSending ? 'Gonderiliyor...' : `Gonder (${bulkMessageModal === 'email' ? selectedPartiesData.filter(p => p.email).length : selectedPartiesData.filter(p => p.phone).length})`}
                    </Button>
                  </div>
                </VStack>
              </Modal>
            )}

            {/* Bulk Delete Confirm */}
            <ConfirmDialog
              isOpen={confirmDeleteBulk}
              title="Toplu Silme"
              description={`${selectedParties.length} hastayi silmek istediginizden emin misiniz? Bu islem geri alinamaz.`}
              onClose={() => setConfirmDeleteBulk(false)}
              onConfirm={async () => {
                for (const id of selectedParties) {
                  const party = sortedParties.find(p => p.id === id);
                  if (party) await handleDeleteParty(party);
                }
                setSelectedParties([]);
                setConfirmDeleteBulk(false);
              }}
              confirmLabel="Sil"
              cancelLabel="Iptal"
              variant="danger"
            />
            <PartyList
              parties={paginatedParties}
              onPartyClick={handlePartyClick}
              onDelete={handleDeleteParty}
              onPartySelect={handlePartySelect}
              selectedParties={selectedParties}
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onTagClick={setTagUpdateParty}
              showSelection={true}
              showActions={true}
              pagination={{
                current: currentPage,
                pageSize: itemsPerPage,
                total: sortedParties.length,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (page, newPageSize) => {
                  setCurrentPage(page);
                  setItemsPerPage(newPageSize);
                }
              }}
            />
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
            // Refetch to get updated list
            await refetch();
            return result;
          } catch (e) {
            console.error('Failed to create party', e);
            throw e;
          }
        }}
        title="Yeni Hasta"
        isLoading={createPartyMutation.isPending}
      />

      {/* Tag Update Modal */}
      <PartyTagUpdateModal
        isOpen={!!tagUpdateParty}
        onClose={() => setTagUpdateParty(null)}
        party={tagUpdateParty}
        onUpdate={handleTagUpdate}
        isLoading={updatePartyMutation.isPending}
      />

      {/* CSV Upload Modal (now shared UniversalImporter with mapping + preview) */}
      <UniversalImporter
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        entityFields={[
          { key: 'firstName', label: 'Ad' },
          { key: 'lastName', label: 'Soyad' },
          { key: 'tcNumber', label: 'TC Kimlik No' },
          { key: 'identityNumber', label: 'Kimlik No' },
          { key: 'phone', label: 'Telefon' },
          { key: 'email', label: 'E-posta' },
          { key: 'birthDate', label: 'Doğum Tarihi' },
          { key: 'gender', label: 'Cinsiyet' },
          { key: 'status', label: 'Durum' },
          { key: 'segment', label: 'Segment' },
          { key: 'acquisitionType', label: 'Kazanım Tipi' },
          { key: 'referredBy', label: 'Referans' },
          { key: 'addressCity', label: 'Şehir' },
          { key: 'addressDistrict', label: 'İlçe' },
          { key: 'addressFull', label: 'Adres' },
          { key: 'tags', label: 'Etiketler' },
          { key: 'notes', label: 'Notlar' },
        ]}
        zodSchema={partiesSchema}
        uploadEndpoint={'/api/parties/bulk-upload'}
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
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-red-200 rounded-2xl">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">
                Bu hastayı silmek istediğinizden emin misiniz?
              </h3>
              <p className="mt-1 text-sm text-destructive">
                {partyToDelete?.firstName} {partyToDelete?.lastName}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Bu işlem geri alınamaz. Hasta kaydı ve tüm ilişkili veriler silinecektir.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPartyToDelete(null)}>İptal</Button>
            <Button variant="danger" onClick={confirmDelete}>Sil</Button>
          </div>
        </div>
      </Modal>

      {/* Noah Import Modal */}
      <NoahImportModal
        open={showNoahImport}
        onClose={() => setShowNoahImport(false)}
        onImportComplete={handleRefresh}
      />
    </div>
  );
}
