import { Input, Button, Textarea, Select } from '@x-ear/ui-web';
import { useState, useEffect, useCallback, useRef } from 'react';
import { User, CheckCircle } from 'lucide-react';
import { partyService } from '../../services/party.service';
import { Party } from '../../types/party';
import type { SupplierRead } from '@/api/generated/schemas';
import { listSuppliers } from '@/api/client/suppliers.client';
import { apiClient } from '@/api/orval-mutator';
import citiesData from '../../data/cities.json';
import { SearchableSelect } from '../ui/SearchableSelect';
import { normalizeCustomerTaxIdFields, resolveCustomerTaxId } from '../../utils/customerTaxId';

interface CustomerSectionCompactProps {
  isSGK?: boolean;
  customerId?: string;
  customerName?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerTcNumber?: string;
  customerTaxNumber?: string;
  customerTaxId?: string;
  customerAddress?: string;
  customerCity?: string;
  customerDistrict?: string;
  onChange: (field: string, value: unknown) => void;
}

// SGK sabit bilgisi
const SGK_CUSTOMER = {
  id: '0',
  name: 'Sosyal Güvenlik Kurumu',
  taxNumber: '7750409379',
  address: 'Çankaya/ ANKARA - TÜRKİYE V.D ÇANKAYA VERGİ DAİRESİ (6257)'
};

type SearchCandidate = {
  id: string;
  kind: 'party' | 'supplier';
  firstName: string;
  lastName: string;
  tcNumber?: string;
  taxNumber?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  taxOffice?: string;
};

type RecipientTagOption = {
  value: string;
  label: string;
  type?: string;
  email?: string;
};

type RecipientLookupResult = {
  taxId: string;
  isEfaturaUser: boolean;
  matchesFound: number;
  defaultReceiverTag?: string | null;
  receiverTags: RecipientTagOption[];
  recipientName?: string | null;
  identityType?: 'company' | 'person' | null;
  companyTitle?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  taxOffice?: string | null;
  identitySource?: string | null;
  message?: string | null;
};

function sanitizeLookupMessage(message?: string | null): string | null {
  const normalized = String(message || '').trim();
  if (!normalized) return null;
  return normalized.replace(/BirFatura/gi, 'E-Fatura');
}

function normalizeDigits(value?: string | null): string {
  return String(value || '').replace(/\D/g, '');
}

function inferIdentityType(taxId?: string | null, customerName?: string | null, customerFirstName?: string | null, customerLastName?: string | null): 'company' | 'person' {
  const digits = normalizeDigits(taxId);
  if (digits.length === 10) return 'company';
  if (digits.length === 11) return 'person';
  if (String(customerName || '').trim()) return 'company';
  if (String(customerFirstName || customerLastName || '').trim()) return 'person';
  return 'person';
}

function mapPartyCandidate(party: Party): SearchCandidate {
  return {
    id: party.id,
    kind: 'party',
    firstName: party.firstName || '',
    lastName: party.lastName || '',
    tcNumber: party.tcNumber || '',
    taxNumber: party.taxNumber || '',
    phone: party.phone || '',
    address: party.addressFull || '',
    city: party.addressCity || '',
    district: party.addressDistrict || '',
  };
}

function mapSupplierCandidate(supplier: SupplierRead): SearchCandidate {
  return {
    id: String(supplier.id),
    kind: 'supplier',
    firstName: supplier.companyName || supplier.name || '',
    lastName: '',
    taxNumber: supplier.taxNumber || '',
    phone: supplier.phone || supplier.mobile || '',
    address: supplier.address || '',
    city: supplier.city || '',
    district: '',
    taxOffice: supplier.taxOffice || '',
  };
}

function mergeCandidates(parties: Party[], suppliers: SupplierRead[]): SearchCandidate[] {
  const unique = new Map<string, SearchCandidate>();

  parties.map(mapPartyCandidate).forEach((candidate) => {
    unique.set(`party:${candidate.id}`, candidate);
  });

  suppliers.map(mapSupplierCandidate).forEach((candidate) => {
    unique.set(`supplier:${candidate.id}`, candidate);
  });

  return Array.from(unique.values());
}

function extractSuppliers(payload: unknown): SupplierRead[] {
  if (Array.isArray(payload)) {
    return payload as SupplierRead[];
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as SupplierRead[];
    }

    if (record.data && typeof record.data === 'object') {
      const dataRecord = record.data as Record<string, unknown>;
      if (Array.isArray(dataRecord.data)) {
        return dataRecord.data as SupplierRead[];
      }
    }
  }

  return [];
}

export function CustomerSectionCompact({
  isSGK = false,
  customerName,
  customerFirstName,
  customerLastName,
  customerTcNumber,
  customerTaxNumber,
  customerTaxId,
  customerAddress,
  customerCity,
  customerDistrict,
  onChange
}: CustomerSectionCompactProps) {
  const [searchResults, setSearchResults] = useState<SearchCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<'identifier' | 'name' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Removed unused selectedParty state - party selection is handled directly via onChange
  const [districts, setDistricts] = useState<string[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [recipientLookup, setRecipientLookup] = useState<RecipientLookupResult | null>(null);
  const [recipientLookupLoading, setRecipientLookupLoading] = useState(false);
  const [selectedReceiverTag, setSelectedReceiverTag] = useState('');
  const lastLookupKeyRef = useRef('');
  const lookupTimerRef = useRef<number | null>(null);

  const lookupBirFaturaRecipient = useCallback(async (rawTaxId: string, options?: { manualEntry?: boolean }) => {
    const taxId = String(rawTaxId || '').trim();
    const manualEntry = options?.manualEntry === true;
    if (taxId.length < 10) {
      setRecipientLookup(null);
      setSelectedReceiverTag('');
      onChange('receiverTag', '');
      return;
    }

    setRecipientLookupLoading(true);
    try {
      const response = await apiClient.get<{ data?: RecipientLookupResult }>('/api/birfatura/recipients/check', {
        params: { tax_id: taxId, manual_entry: manualEntry }
      });
      const data = response.data?.data
        ? {
            ...response.data.data,
            message: sanitizeLookupMessage(response.data.data.message),
          }
        : null;
      setRecipientLookup(data);

      const nextReceiverTag = data?.defaultReceiverTag || data?.receiverTags?.[0]?.value || '';
      setSelectedReceiverTag(nextReceiverTag);
      onChange('receiverTag', nextReceiverTag);
      if (manualEntry) {
        const identityType = data?.identityType || inferIdentityType(taxId, customerName, customerFirstName, customerLastName);
        if (identityType === 'company') {
          const nextCompanyTitle = String(data?.companyTitle || data?.recipientName || '').trim();
          if (nextCompanyTitle) {
            onChange('customerName', nextCompanyTitle);
          }
          onChange('customerFirstName', '');
          onChange('customerLastName', '');
        } else {
          const nextFirstName = String(data?.firstName || '').trim();
          const nextLastName = String(data?.lastName || '').trim();
          if (nextFirstName || nextLastName) {
            onChange('customerFirstName', nextFirstName);
            onChange('customerLastName', nextLastName);
          }
          onChange('customerName', '');
        }
        if (String(data?.taxOffice || '').trim()) {
          onChange('taxOffice', String(data?.taxOffice || '').trim());
        }
      }
      if (nextReceiverTag) {
        const selectedTag = data?.receiverTags?.find((tag) => tag.value === nextReceiverTag);
        onChange('customerLabel', {
          labelId: nextReceiverTag,
          labelName: selectedTag?.label || nextReceiverTag,
          color: data?.isEfaturaUser ? '#2563EB' : '#6B7280',
        });
      }
    } catch (error) {
      console.error('E-Fatura alici sorgu hatasi:', error);
      const providerDetail =
        (error as { response?: { data?: { detail?: string; message?: string } }; message?: string })?.response?.data?.detail ||
        (error as { response?: { data?: { detail?: string; message?: string } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        'E-Fatura sorgusu su anda tamamlanamadi';
      setRecipientLookup({
        taxId,
        isEfaturaUser: false,
        matchesFound: 0,
        defaultReceiverTag: null,
        receiverTags: [],
        message: sanitizeLookupMessage(providerDetail),
      });
      setSelectedReceiverTag('');
      onChange('receiverTag', '');
    } finally {
      setRecipientLookupLoading(false);
    }
  }, [customerFirstName, customerLastName, customerName, onChange]);

  const resolvedCustomerTaxId = resolveCustomerTaxId({ customerTaxId, customerTcNumber, customerTaxNumber });
  const identityType = inferIdentityType(resolvedCustomerTaxId, customerName, customerFirstName, customerLastName);

  const scheduleRecipientLookup = useCallback((rawTaxId: string, manualEntry: boolean) => {
    const normalizedTaxId = String(rawTaxId || '').trim();
    if (lookupTimerRef.current) {
      window.clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = null;
    }
    if (normalizedTaxId.length < 10) {
      lastLookupKeyRef.current = '';
      setRecipientLookup(null);
      setSelectedReceiverTag('');
      onChange('receiverTag', '');
      return;
    }
    const lookupKey = `${manualEntry ? 'manual' : 'selection'}:${normalizedTaxId}`;
    if (lookupKey === lastLookupKeyRef.current) return;
    lookupTimerRef.current = window.setTimeout(() => {
      lastLookupKeyRef.current = lookupKey;
      void lookupBirFaturaRecipient(normalizedTaxId, { manualEntry });
    }, manualEntry ? 400 : 0);
  }, [lookupBirFaturaRecipient, onChange]);

  useEffect(() => () => {
    if (lookupTimerRef.current) {
      window.clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = null;
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showResults) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Keep dropdown open only if clicking inside it
      if (dropdownRef.current?.contains(target)) return;
      setShowResults(false);
      setActiveSearchField(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showResults]);

  // SGK modunda otomatik doldur
  useEffect(() => {
    if (isSGK) {
      onChange('customerId', SGK_CUSTOMER.id);
      onChange('customerFirstName', 'Sosyal Güvenlik');
      onChange('customerLastName', 'Kurumu');
      onChange('customerTaxId', SGK_CUSTOMER.taxNumber);
      onChange('customerAddress', SGK_CUSTOMER.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSGK]);

  const applyCandidateSelection = useCallback((candidate: SearchCandidate) => {
    if (lookupTimerRef.current) {
      window.clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = null;
    }
    setShowResults(false);
    setShowSuccessMessage(true);

    onChange('customerId', candidate.kind === 'supplier' ? `supplier:${candidate.id}` : candidate.id);
    const normalizedIdentity = normalizeCustomerTaxIdFields({
      customerTaxId: candidate.taxNumber || candidate.tcNumber || '',
    });
    onChange('customerTaxId', normalizedIdentity.customerTaxId);
    if (candidate.taxNumber) {
      onChange('customerName', candidate.firstName);
      onChange('customerFirstName', '');
      onChange('customerLastName', '');
    } else {
      onChange('customerName', '');
      onChange('customerFirstName', candidate.firstName);
      onChange('customerLastName', candidate.lastName);
    }

    let addressText = candidate.address || '';
    const cityValue = candidate.city || '';
    const districtValue = candidate.district || '';

    if (!addressText) {
      const parts: string[] = [];
      if (districtValue) parts.push(districtValue);
      if (cityValue) parts.push(cityValue);
      addressText = parts.join(' - ');
    }

    onChange('customerAddress', addressText);
    onChange('customerCity', cityValue);
    onChange('customerDistrict', districtValue);
    onChange('taxOffice', candidate.taxOffice || '');
    if (cityValue) {
      const cityData = citiesData.cities.find(c => c.name === cityValue);
      if (cityData) {
        setDistricts(cityData.districts);
      }
    }

    // Mesajı 3 saniye sonra gizle
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
    scheduleRecipientLookup(normalizedIdentity.customerTaxId, false);
  }, [onChange, scheduleRecipientLookup]);

  // TC ile hasta arama
  const handleIdentifierSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    setActiveSearchField('identifier');

    try {
      const [partyResult, supplierResult] = await Promise.all([
        partyService.getParties({
          search: query,
          limit: 10
        }),
        listSuppliers({
          search: query,
          per_page: 10
        })
      ]);

      const mergedResults = mergeCandidates(
        partyResult.parties as Party[],
        extractSuppliers(supplierResult as unknown)
      );
      setSearchResults(mergedResults);

      const normalizedQuery = String(query || '').replace(/\D/g, '');
      const exactMatches = mergedResults.filter((candidate) => {
        const candidateIdentity = String(candidate.taxNumber || candidate.tcNumber || '').replace(/\D/g, '');
        return candidateIdentity !== '' && candidateIdentity === normalizedQuery;
      });

      if (normalizedQuery.length >= 10 && exactMatches.length === 1) {
        applyCandidateSelection(exactMatches[0]);
      }
    } catch (error) {
      console.error('Alıcı arama hatası:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [applyCandidateSelection]);

  // Ad ile hasta arama
  const handleNameSearch = useCallback(async (name: string) => {
    if (name.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    setActiveSearchField('name');

    try {
      const result = await partyService.getParties({
        search: name,
        limit: 10
      });
      const supplierResult = await listSuppliers({
        search: name,
        per_page: 10
      });

      setSearchResults(
        mergeCandidates(
          result.parties as Party[],
          extractSuppliers(supplierResult as unknown)
        )
      );
    } catch (error) {
      console.error('Alıcı arama hatası:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Alıcı seçimi
  const handleSearchSelect = useCallback((candidate: SearchCandidate) => {
    applyCandidateSelection(candidate);
  }, [applyCandidateSelection]);

  // İl değiştiğinde ilçeleri yükle
  const handleCityChange = useCallback((city: string) => {
    onChange('customerCity', city);
    onChange('customerDistrict', ''); // İlçeyi sıfırla

    const cityData = citiesData.cities.find(c => c.name === city);
    if (cityData) {
      setDistricts(cityData.districts);
    } else {
      setDistricts([]);
    }
  }, [onChange]);

  // İlk yüklemede mevcut il varsa ilçeleri yükle
  useEffect(() => {
    if (customerCity) {
      const cityData = citiesData.cities.find(c => c.name === customerCity);
      if (cityData) {
        setDistricts(cityData.districts);
      }
    }
  }, [customerCity]);

  // Manuel düzenleme
  const handleManualEdit = useCallback((field: string, value: string) => {
    onChange(field, value);
  }, [onChange]);

  // Alıcıyı temizle
  const handleClearCustomer = useCallback(() => {
    // Removed setSelectedParty - not needed
    setShowSuccessMessage(false);
    setSearchResults([]);
    setShowResults(false);
    setActiveSearchField(null);
    onChange('customerId', '');
    onChange('customerName', '');
    onChange('customerFirstName', '');
    onChange('customerLastName', '');
    onChange('customerName', '');
    onChange('customerTaxId', '');
    onChange('customerAddress', '');
    onChange('customerCity', '');
    onChange('customerDistrict', '');
    onChange('taxOffice', '');
    onChange('receiverTag', '');
    onChange('customerLabel', null);
    setDistricts([]);
    setRecipientLookup(null);
    setSelectedReceiverTag('');
    lastLookupKeyRef.current = '';
  }, [onChange]);

  // SGK modu
  if (isSGK) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <User className="text-blue-600" size={16} />
            <h3 className="text-sm font-bold text-gray-900">Fatura Alıcı</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Alıcı Adı
              </label>
              <div className="text-sm text-gray-900 font-medium">
                {SGK_CUSTOMER.name}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Vergi No
              </label>
              <div className="text-sm text-gray-600">
                {SGK_CUSTOMER.taxNumber}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Adres
              </label>
              <div className="text-xs text-gray-600 leading-relaxed">
                {SGK_CUSTOMER.address}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded">
            SGK faturası için alıcı bilgisi sabittir.
          </p>
        </div>
      </div>
    );
  }

  // Normal mod
  return (
    <div ref={containerRef} className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="text-gray-600" size={16} />
            <h3 className="text-sm font-bold text-gray-900">Fatura Alıcısı</h3>
          </div>
          {(customerName || customerFirstName || customerLastName || resolvedCustomerTaxId) && (
            <Button
              type="button"
              onClick={handleClearCustomer}
              variant="default"
              className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700"
            >
              Alıcıyı Sil
            </Button>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {/* TC / Vergi No - En Üstte */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              TC / Vergi No <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                data-testid="invoice-customer-tax-input"
                type="text"
                value={resolvedCustomerTaxId}
                onChange={(e) => {
                  const value = e.target.value;
                  const normalizedIdentity = normalizeCustomerTaxIdFields({ customerTaxId: value });
                  handleManualEdit('customerTaxId', normalizedIdentity.customerTaxId);
                  const nextType = inferIdentityType(normalizedIdentity.customerTaxId, customerName, customerFirstName, customerLastName);
                  if (nextType === 'company') {
                    onChange('customerFirstName', '');
                    onChange('customerLastName', '');
                  }
                  if (nextType === 'person') {
                    onChange('customerName', '');
                  }
                  handleIdentifierSearch(value);
                  scheduleRecipientLookup(normalizedIdentity.customerTaxId, true);
                }}
                placeholder="TC Kimlik (11 haneli) veya Vergi No"
                className="w-full text-sm"
              />
              {(isSearching || recipientLookupLoading) && (
                <div className="absolute right-2 top-2.5">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {/* TC Arama Sonuçları */}
            {showResults && searchResults.length > 0 && activeSearchField === 'identifier' && (
              <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <Button
                    key={`${result.kind}:${result.id}`}
                    type="button"
                    onClick={() => handleSearchSelect(result)}
                    variant="ghost"
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {result.firstName} {result.lastName}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {result.kind === 'supplier' ? 'Tedarikçi' : 'Hasta'}
                    </div>
                    {result.tcNumber && (
                      <div className="text-xs text-gray-500">TC: {result.tcNumber}</div>
                    )}
                    {result.taxNumber && (
                      <div className="text-xs text-gray-500">VKN: {result.taxNumber}</div>
                    )}
                    {result.phone && (
                      <div className="text-xs text-gray-500">Tel: {result.phone}</div>
                    )}
                  </Button>
                ))}
              </div>
            )}

            {recipientLookup && (
              <div className={`mt-2 rounded-xl border px-3 py-2 text-xs ${
                recipientLookup.isEfaturaUser
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {recipientLookup.isEfaturaUser ? 'E-Fatura kullanicisi' : 'E-Fatura etiketi bulunamadi'}
                  </span>
                  {recipientLookup.matchesFound > 0 && (
                    <span>{recipientLookup.matchesFound} etiket</span>
                  )}
                </div>
                {recipientLookup.message && (
                  <div className="mt-1 opacity-80">{recipientLookup.message}</div>
                )}
              </div>
            )}

            {recipientLookup?.receiverTags?.length ? (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Alici Etiketi
                </label>
                <Select
                  value={selectedReceiverTag}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setSelectedReceiverTag(nextValue);
                    onChange('receiverTag', nextValue);
                    const selectedTag = recipientLookup.receiverTags.find((tag) => tag.value === nextValue);
                    onChange('customerLabel', {
                      labelId: nextValue,
                      labelName: selectedTag?.label || nextValue,
                      color: '#2563EB',
                    });
                  }}
                  options={[
                    { value: '', label: 'Alici etiketi seciniz' },
                    ...recipientLookup.receiverTags.map((tag) => ({
                      value: tag.value,
                      label: `${tag.label}${tag.type ? ` (${tag.type})` : ''}`,
                    })),
                  ]}
                  className="w-full text-sm"
                />
              </div>
            ) : null}
          </div>

          {identityType === 'company' ? (
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Unvan <span className="text-red-500">*</span>
              </label>
              <Input
                data-testid="invoice-customer-company-name-input"
                type="text"
                value={customerName || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleManualEdit('customerName', value);
                  onChange('customerFirstName', '');
                  onChange('customerLastName', '');
                  if (value.length >= 2) {
                    handleNameSearch(value);
                  } else {
                    setShowResults(false);
                  }
                }}
                placeholder="Unvan (tedarikçi ara)"
                className="w-full text-sm"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ad <span className="text-red-500">*</span>
                </label>
                <Input
                  data-testid="invoice-customer-first-name-input"
                  type="text"
                  value={customerFirstName || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleManualEdit('customerFirstName', value);
                    onChange('customerName', '');
                    if (value.length >= 2) {
                      handleNameSearch(value);
                    } else {
                      setShowResults(false);
                    }
                  }}
                  placeholder="Ad (hasta ara)"
                  className="w-full text-sm"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Soyad <span className="text-red-500">*</span>
                </label>
                <Input
                  data-testid="invoice-customer-last-name-input"
                  type="text"
                  value={customerLastName || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleManualEdit('customerLastName', value);
                    onChange('customerName', '');
                    if (value.length >= 2) {
                      handleNameSearch(value);
                    } else {
                      setShowResults(false);
                    }
                  }}
                  placeholder="Soyad (hasta ara)"
                  className="w-full text-sm"
                />
              </div>
            </div>
          )}

          {/* Ad/Soyad ile arama tetiklendiğinde dropdown TC bloğunda gösterilir (activeSearchField='name')
               - Eğer TC araması yoksa, ad bloğu altında göster */}
          {showResults && searchResults.length > 0 && activeSearchField === 'name' && (
            <div ref={dropdownRef} className="relative">
              <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <Button
                    key={`${result.kind}:${result.id}`}
                    type="button"
                    onClick={() => handleSearchSelect(result)}
                    variant="ghost"
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {result.firstName} {result.lastName}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {result.kind === 'supplier' ? 'Tedarikçi' : 'Hasta'}
                    </div>
                    {result.tcNumber && (
                      <div className="text-xs text-gray-500">TC: {result.tcNumber}</div>
                    )}
                    {result.taxNumber && (
                      <div className="text-xs text-gray-500">VKN: {result.taxNumber}</div>
                    )}
                    {result.phone && (
                      <div className="text-xs text-gray-500">Tel: {result.phone}</div>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* İl ve İlçe - Yan Yana - Searchable */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <SearchableSelect
                data-testid="invoice-customer-city-select"
                label="İl"
                value={customerCity || ''}
                onChange={handleCityChange}
                options={citiesData.cities.map(city => ({
                  value: city.name,
                  label: city.name
                }))}
                placeholder="İl seçiniz..."
                fullWidth
              />
            </div>
            <div>
              <SearchableSelect
                data-testid="invoice-customer-district-select"
                label="İlçe"
                value={customerDistrict || ''}
                onChange={(value) => handleManualEdit('customerDistrict', value)}
                disabled={!customerCity || districts.length === 0}
                options={districts.map(district => ({
                  value: district,
                  label: district
                }))}
                placeholder="İlçe seçiniz..."
                fullWidth
              />
            </div>
          </div>

          {/* Adres */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Adres
            </label>
            <Textarea
              data-testid="invoice-customer-address-input"
              value={customerAddress || ''}
              onChange={(e) => handleManualEdit('customerAddress', e.target.value)}
              placeholder="Fatura adresi"
              rows={2}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {showSuccessMessage && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-2 flex items-center gap-2 animate-fade-in">
              <CheckCircle className="text-green-600" size={14} />
              <p className="text-xs text-green-800">
                Alici bulundu ve bilgiler dolduruldu
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
