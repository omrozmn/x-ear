import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, Filter, X, MapPin, User, FileText, Save, Star, Clock, Trash2 } from 'lucide-react';
import { Button, Input, Checkbox, Badge, Card, Modal, useModal, Textarea, useToastHelpers } from '@x-ear/ui-web';
import { Patient } from '../../types/patient';
import { fuzzySearch, FuzzySearchOptions } from '../../utils/fuzzy-search';
import { savedQueries, SavedQuery } from '../../utils/saved-queries';

interface PatientAdvancedSearchProps {
  patients: Patient[];
  onFilteredResults: (results: Patient[]) => void;
  onClearFilters: () => void;
}

interface SearchFilters {
  query: string;
  fuzzySearch: boolean;
  fuzzyThreshold: number;
  ageRange: {
    min: number | null;
    max: number | null;
  };
  dateRange: {
    start: string;
    end: string;
  };
  location: string;
  tags: string[];
  segment: string;
  status: string;
  hasPhone: boolean | null;
  hasEmail: boolean | null;
  hasNotes: boolean | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface SearchField {
  id: keyof SearchFilters;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'tags';
  icon: React.ReactNode;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

const SEARCH_FIELDS: SearchField[] = [
  {
    id: 'query',
    label: 'Genel Arama',
    type: 'text',
    icon: <Search className="w-4 h-4" />,
    placeholder: 'Ad, telefon, e-posta ile ara...'
  },
  {
    id: 'location',
    label: 'Konum',
    type: 'text',
    icon: <MapPin className="w-4 h-4" />,
    placeholder: 'Şehir, ilçe, mahalle...'
  },
  {
    id: 'segment',
    label: 'Segment',
    type: 'select',
    icon: <User className="w-4 h-4" />,
    options: [
      { label: 'Tümü', value: '' },
      { label: 'VIP', value: 'vip' },
      { label: 'Yeni', value: 'new' },
      { label: 'Deneme', value: 'trial' },
      { label: 'Satın Alınmış', value: 'purchased' },
      { label: 'Kontrol', value: 'control' },
      { label: 'Yenileme', value: 'renewal' },
      { label: 'Mevcut', value: 'existing' }
    ]
  },
  {
    id: 'status',
    label: 'Durum',
    type: 'select',
    icon: <FileText className="w-4 h-4" />,
    options: [
      { label: 'Tümü', value: '' },
      { label: 'Aktif', value: 'active' },
      { label: 'Pasif', value: 'inactive' }
    ]
  }
];

const SORT_OPTIONS = [
  { label: 'Ad (A-Z)', value: 'name' },
  { label: 'Kayıt Tarihi', value: 'createdAt' },
  { label: 'Son Güncelleme', value: 'updatedAt' },
  { label: 'Yaş', value: 'age' },
  { label: 'Telefon', value: 'phone' }
];

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  fuzzySearch: true,
  fuzzyThreshold: 0.6,
  ageRange: { min: null, max: null },
  dateRange: { start: '', end: '' },
  location: '',
  tags: [],
  segment: '',
  status: '',
  hasPhone: null,
  hasEmail: null,
  hasNotes: null,
  sortBy: 'name',
  sortOrder: 'asc'
};

export const PatientAdvancedSearch: React.FC<PatientAdvancedSearchProps> = ({
  patients,
  onFilteredResults,
  onClearFilters
}) => {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [savedQueriesList, setSavedQueriesList] = useState<SavedQuery[]>([]);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [selectedSavedQuery, setSelectedSavedQuery] = useState<SavedQuery | null>(null);
  
  // Modals
  const saveQueryModal = useModal();
  const editQueryModal = useModal();
  
  // Toast helpers
  const { success, error, warning } = useToastHelpers();
  
  // Save query form state
  const [saveQueryForm, setSaveQueryForm] = useState({
    name: '',
    description: '',
    isDefault: false,
    tags: [] as string[]
  });

  // Load saved queries on mount
  useEffect(() => {
    setSavedQueriesList(savedQueries.load());
  }, []);

  // Mevcut etiketleri çıkar
  const extractedTags = useMemo(() => {
    const tagSet = new Set<string>();
    patients.forEach(patient => {
      patient.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [patients]);

  // Filtrelenmiş sonuçları hesapla
  const filteredResults = useMemo(() => {
    let results = [...patients];

    // Fuzzy search implementation
    if (filters.query.trim()) {
      if (filters.fuzzySearch) {
        const fuzzyOptions: FuzzySearchOptions = {
          threshold: filters.fuzzyThreshold,
          keys: ['name', 'phone', 'email', 'address', 'tcNumber'],
          includeScore: true
        };
        
        const fuzzyResults = fuzzySearch(results, filters.query, fuzzyOptions);
        results = fuzzyResults.map(result => result.item);
      } else {
        // Exact search (existing logic)
        const query = filters.query.toLowerCase();
        results = results.filter(patient => {
          const address = typeof patient.address === 'string' ? patient.address : patient.addressFull;
          return patient.firstName?.toLowerCase().includes(query) ||
            patient.lastName?.toLowerCase().includes(query) ||
            patient.phone?.toLowerCase().includes(query) ||
            patient.email?.toLowerCase().includes(query) ||
            address?.toLowerCase().includes(query);
        });
      }
    }

    // Yaş aralığı
    if (filters.ageRange.min !== null || filters.ageRange.max !== null) {
      results = results.filter(patient => {
        if (!patient.birthDate) return false;
        const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
        if (filters.ageRange.min !== null && age < filters.ageRange.min) return false;
        if (filters.ageRange.max !== null && age > filters.ageRange.max) return false;
        return true;
      });
    }

    // Tarih aralığı
    if (filters.dateRange.start || filters.dateRange.end) {
      results = results.filter(patient => {
        if (!patient.createdAt) return false;
        const createdDate = new Date(patient.createdAt);
        if (filters.dateRange.start && createdDate < new Date(filters.dateRange.start)) return false;
        if (filters.dateRange.end && createdDate > new Date(filters.dateRange.end)) return false;
        return true;
      });
    }

    // Konum
    if (filters.location.trim()) {
      const location = filters.location.toLowerCase();
      results = results.filter(patient => {
        const address = typeof patient.address === 'string' ? patient.address : patient.addressFull;
        return address?.toLowerCase().includes(location);
      });
    }

    // Etiketler
    if (filters.tags.length > 0) {
      results = results.filter(patient =>
        filters.tags.some(tag => patient.tags?.includes(tag))
      );
    }

    // Segment
    if (filters.segment) {
      results = results.filter(patient => patient.segment === filters.segment);
    }

    // Durum
    if (filters.status) {
      results = results.filter(patient => patient.status === filters.status);
    }

    // Telefon varlığı
    if (filters.hasPhone !== null) {
      results = results.filter(patient =>
        filters.hasPhone ? !!patient.phone : !patient.phone
      );
    }

    // E-posta varlığı
    if (filters.hasEmail !== null) {
      results = results.filter(patient =>
        filters.hasEmail ? !!patient.email : !patient.email
      );
    }

    // Not varlığı
    if (filters.hasNotes !== null) {
      results = results.filter(patient =>
        filters.hasNotes ? (patient.notes && patient.notes.length > 0) : (!patient.notes || patient.notes.length === 0)
      );
    }

    // Sıralama
    results.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (filters.sortBy === 'name') {
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (filters.sortBy === 'age') {
        aValue = a.birthDate ? new Date().getFullYear() - new Date(a.birthDate).getFullYear() : 0;
        bValue = b.birthDate ? new Date().getFullYear() - new Date(b.birthDate).getFullYear() : 0;
      } else {
        aValue = a[filters.sortBy as keyof Patient];
        bValue = b[filters.sortBy as keyof Patient];
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }, [patients, filters]);

  // Save current search as a saved query
  const handleSaveQuery = useCallback(async () => {
    try {
      if (!saveQueryForm.name.trim()) {
        error('Sorgu adı gereklidir');
        return;
      }

      const newQuery = savedQueries.create(
        saveQueryForm.name,
        filters.query,
        filters,
        {
          description: saveQueryForm.description,
          isDefault: saveQueryForm.isDefault,
          tags: saveQueryForm.tags
        }
      );

      setSavedQueriesList(savedQueries.load());
      success('Sorgu başarıyla kaydedildi');
      saveQueryModal.closeModal();
      
      // Reset form
      setSaveQueryForm({
        name: '',
        description: '',
        isDefault: false,
        tags: []
      });
    } catch (err: any) {
      error(err.message || 'Sorgu kaydedilemedi');
    }
  }, [saveQueryForm, filters, success, error, saveQueryModal]);

  // Load a saved query
  const handleLoadSavedQuery = useCallback((query: SavedQuery) => {
    try {
      // Use the saved query to increment usage count
      savedQueries.use(query.id);
      
      // Apply the saved filters
      setFilters(query.filters as SearchFilters);
      setSelectedSavedQuery(query);
      
      success(`"${query.name}" sorgusu yüklendi`);
      setSavedQueriesList(savedQueries.load()); // Refresh to update usage count
    } catch (err: any) {
      error(err.message || 'Sorgu yüklenemedi');
    }
  }, [success, error]);

  // Delete a saved query
  const handleDeleteSavedQuery = useCallback((queryId: string) => {
    try {
      savedQueries.delete(queryId);
      setSavedQueriesList(savedQueries.load());
      success('Sorgu silindi');
    } catch (err: any) {
      error(err.message || 'Sorgu silinemedi');
    }
  }, [success, error]);

  // Filtreleri uygula
  const applyFilters = useCallback(() => {
    onFilteredResults(filteredResults);
  }, [filteredResults, onFilteredResults]);

  // Filtreleri temizle
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSelectedSavedQuery(null);
    onClearFilters();
  }, [onClearFilters]);

  // Filtre değerini güncelle
  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedSavedQuery(null); // Clear selected query when filters change
  }, []);

  // Etiket ekle/çıkar
  const toggleTag = useCallback((tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
    setSelectedSavedQuery(null);
  }, []);

  // Aktif filtre sayısı
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query.trim()) count++;
    if (filters.ageRange.min !== null || filters.ageRange.max !== null) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.location.trim()) count++;
    if (filters.tags.length > 0) count++;
    if (filters.segment) count++;
    if (filters.status) count++;
    if (filters.hasPhone !== null) count++;
    if (filters.hasEmail !== null) count++;
    if (filters.hasNotes !== null) count++;
    return count;
  }, [filters]);

  // Otomatik filtreleme
  React.useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <Card className="mb-6">
      <div className="p-4">
        {/* Header with Search Input and Controls */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              placeholder="Hasta ara... (fuzzy search aktif)"
              className="pl-10 pr-4"
            />
          </div>
          
          {/* Fuzzy Search Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={filters.fuzzySearch}
              onChange={(checked) => updateFilter('fuzzySearch', checked)}
            />
            <span className="text-sm text-gray-600">Fuzzy Search</span>
          </div>
          
          {/* Saved Queries Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavedQueries(!showSavedQueries)}
            className="relative"
          >
            <Star className="w-4 h-4 mr-1" />
            Kayıtlı Sorgular
            {savedQueriesList.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {savedQueriesList.length}
              </Badge>
            )}
          </Button>
          
          {/* Save Current Query Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={saveQueryModal.openModal}
            disabled={!filters.query.trim() && Object.values(filters).every(v => 
              v === '' || v === null || v === false || (Array.isArray(v) && v.length === 0)
            )}
          >
            <Save className="w-4 h-4 mr-1" />
            Kaydet
          </Button>
          
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Filter className="w-4 h-4 mr-1" />
            {isExpanded ? 'Gizle' : 'Filtreler'}
            {activeFilterCount > 0 && (
              <Badge variant="primary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
              Temizle
            </Button>
          )}
        </div>

        {/* Fuzzy Search Threshold */}
        {filters.fuzzySearch && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-blue-900">
                Fuzzy Search Hassasiyeti: {Math.round(filters.fuzzyThreshold * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={filters.fuzzyThreshold}
                onChange={(e) => updateFilter('fuzzyThreshold', parseFloat(e.target.value))}
                className="w-32"
              />
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Düşük değer: Daha esnek arama, Yüksek değer: Daha kesin arama
            </p>
          </div>
        )}

        {/* Saved Queries Panel */}
        {showSavedQueries && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Kayıtlı Sorgular</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavedQueries(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {savedQueriesList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Henüz kayıtlı sorgu yok
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedQueriesList.map((query) => (
                  <div
                    key={query.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      selectedSavedQuery?.id === query.id 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => handleLoadSavedQuery(query)}>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{query.name}</span>
                        {query.isDefault && (
                          <Badge variant="primary" size="sm">Varsayılan</Badge>
                        )}
                        <Badge variant="secondary" size="sm">
                          {query.usageCount} kullanım
                        </Badge>
                      </div>
                      {query.description && (
                        <p className="text-xs text-gray-600 mt-1">{query.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>"{query.query}"</span>
                        {query.lastUsed && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {query.lastUsed.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSavedQuery(query.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ... existing expanded filters section ... */}

        {/* Save Query Modal */}
        <Modal
          isOpen={saveQueryModal.isOpen}
          onClose={saveQueryModal.closeModal}
          title="Sorguyu Kaydet"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sorgu Adı *
              </label>
              <Input
                value={saveQueryForm.name}
                onChange={(e) => setSaveQueryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: VIP müşteriler, Aktif hastalar..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <Textarea
                value={saveQueryForm.description}
                onChange={(e) => setSaveQueryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Bu sorgunun ne için kullanıldığını açıklayın..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={saveQueryForm.isDefault}
                onChange={(e) => setSaveQueryForm(prev => ({ ...prev, isDefault: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">Varsayılan sorgu olarak işaretle</span>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Kaydedilecek Filtreler:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                {filters.query && <div>• Arama: "{filters.query}"</div>}
                {filters.segment && <div>• Segment: {filters.segment}</div>}
                {filters.status && <div>• Durum: {filters.status}</div>}
                {filters.tags.length > 0 && <div>• Etiketler: {filters.tags.join(', ')}</div>}
                {filters.location && <div>• Konum: {filters.location}</div>}
                {(filters.ageRange.min || filters.ageRange.max) && (
                  <div>• Yaş: {filters.ageRange.min || 0}-{filters.ageRange.max || '∞'}</div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={saveQueryModal.closeModal}>
                İptal
              </Button>
              <Button onClick={handleSaveQuery}>
                <Save className="w-4 h-4 mr-2" />
                Kaydet
              </Button>
            </div>
          </div>
        </Modal>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
          <span>
            {filteredResults.length} hasta bulundu
            {patients.length !== filteredResults.length && ` (${patients.length} toplam)`}
          </span>
          {selectedSavedQuery && (
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-blue-600">"{selectedSavedQuery.name}" sorgusu aktif</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PatientAdvancedSearch;