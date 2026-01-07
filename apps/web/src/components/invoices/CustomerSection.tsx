import { Input, Select, Button } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { Edit2, Plus } from 'lucide-react';
import { InvoiceFormData } from '../../types/invoice';
import {
  useSearchFirmCustomersMock,
  useGetFirmPkInfoMock,
  useGetFirmAddressInfoMock
} from '../../api/generated/bir-fatura/bir-fatura';
import { unwrapArray } from '../../utils/response-unwrap';

interface CustomerSectionProps {
  isSGK?: boolean;
  formData: InvoiceFormData;
  onChange: (field: keyof InvoiceFormData, value: any) => void;
  errors?: Record<string, string>;
  onCustomerEdit?: () => void;
}

interface CustomerSearchResult {
  id: string;
  name: string;
  taxNumber?: string;
  tcNumber?: string;
  isEInvoiceUser?: boolean;
  defaultLabel?: string;
}

interface CustomerAddress {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
}

interface CustomerLabel {
  value: string;
  label: string;
}

// SGK sabit bilgisi
const SGK_CUSTOMER_TEXT = 'Sosyal Güvenlik Kurumu - 7750409379 Çankaya/ ANKARA - TÜRKİYE V.D ÇANKAYA VERGİ DAİRESİ (6257)';

export function CustomerSection({
  isSGK = false,
  formData,
  onChange,
  errors = {},
  onCustomerEdit
}: CustomerSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [customerLabels, setCustomerLabels] = useState<CustomerLabel[]>([]);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [showLabels, setShowLabels] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);

  // Orval Hooks
  const searchMutation = useSearchFirmCustomersMock();
  const pkInfoMutation = useGetFirmPkInfoMock();
  const addressInfoMutation = useGetFirmAddressInfoMock();

  // SGK durumu için önceki müşteri bilgilerini sakla
  const [previousCustomerState, setPreviousCustomerState] = useState<{
    customerId?: string;
    customerName?: string;
    searchQuery?: string;
  } | null>(null);

  // SGK moduna geçildiğinde mevcut müşteri bilgilerini sakla
  useEffect(() => {
    if (isSGK && !previousCustomerState && formData.customerId) {
      setPreviousCustomerState({
        customerId: formData.customerId,
        customerName: formData.customerName,
        searchQuery: searchQuery
      });

      // SGK için müşteri ID'sini 0 yap
      onChange('customerId', '0');
      onChange('customerName', SGK_CUSTOMER_TEXT);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSGK]);

  // SGK modundan çıkıldığında önceki müşteri bilgilerini geri yükle
  useEffect(() => {
    if (!isSGK && previousCustomerState) {
      onChange('customerId', previousCustomerState.customerId);
      onChange('customerName', previousCustomerState.customerName);
      setSearchQuery(previousCustomerState.searchQuery || '');
      setPreviousCustomerState(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSGK]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchMutation.mutateAsync({
        data: { search: query }
      });

      const results = unwrapArray<CustomerSearchResult>(response) || [];
      setSearchResults(results);

    } catch (error) {
      console.error('Müşteri arama hatası:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Müşteri seçimi
  const handleCustomerSelect = async (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setSearchQuery(customer.name);
    setSearchResults([]);

    onChange('customerId', customer.id);
    onChange('customerName', customer.name);
    onChange('customerTaxNumber', customer.taxNumber);

    // E-Fatura mükellefi kontrolü ve PK etiket listesi
    if (customer.isEInvoiceUser && customer.taxNumber) {
      try {
        const response = await pkInfoMutation.mutateAsync({
          data: { customer_id: customer.id }
        });
        const labels = unwrapArray<CustomerLabel>(response) || [];

        if (labels.length > 0) {
          setCustomerLabels(labels);
          setShowLabels(true);
        }
      } catch (error) {
        console.error('PK etiket listesi hatası:', error);
      }
    }

    // Adres listesi
    try {
      const response = await addressInfoMutation.mutateAsync({
        data: { customer_id: customer.id }
      });
      const addresses = unwrapArray<CustomerAddress>(response) || [];

      if (addresses.length > 0) {
        setCustomerAddresses(addresses);
        setShowAddresses(true);
      }
    } catch (error) {
      console.error('Adres listesi hatası:', error);
    }
  };

  // Müşteri düzenleme
  const handleCustomerEdit = () => {
    if (onCustomerEdit) {
      onCustomerEdit();
    }
  };

  // SGK modu
  if (isSGK) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fatura Alıcı Bilgileri</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alıcı Adı
            </label>
            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
              {SGK_CUSTOMER_TEXT}
            </div>
            <p className="mt-2 text-sm text-blue-600">
              SGK faturası için alıcı bilgisi sabittir.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal mod
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fatura Alıcı Bilgileri</h3>

      <div className="space-y-4">
        {/* Müşteri Arama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alıcı Adı <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Müşteri adını veya TCKN ya da Vergi Numarası Giriniz"
                className="w-full"
                error={errors.customerId}
              />

              {/* Arama Sonuçları */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      {customer.taxNumber && (
                        <div className="text-sm text-gray-500">VKN: {customer.taxNumber}</div>
                      )}
                      {customer.tcNumber && (
                        <div className="text-sm text-gray-500">TC: {customer.tcNumber}</div>
                      )}
                      {customer.isEInvoiceUser && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                          E-Fatura Mükellefi
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleCustomerEdit}
              variant={selectedCustomer ? 'default' : 'default'}
              className={selectedCustomer ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {selectedCustomer ? (
                <>
                  <Edit2 size={16} className="mr-1" />
                  Düzenle
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-1" />
                  Ekle
                </>
              )}
            </Button>
          </div>
          {errors.customerId && (
            <p className="mt-1 text-sm text-red-600">{errors.customerId}</p>
          )}
        </div>

        {/* PK Etiket Seçimi (E-Fatura mükellefi için) */}
        {showLabels && customerLabels.length > 0 && (
          <div>
            <Select
              label="Alıcı Etiketi"
              value={formData.customerLabel || ''}
              onChange={(e) => onChange('customerLabel', e.target.value)}
              options={[
                { value: '', label: 'Seçiniz' },
                ...customerLabels.map(l => ({ value: l.value, label: l.label }))
              ]}
              fullWidth
            />
            <p className="mt-1 text-sm text-gray-500">
              E-Fatura mükellefi için PK etiket seçimi
            </p>
          </div>
        )}

        {/* Adres Seçimi */}
        {showAddresses && customerAddresses.length > 0 && (
          <div>
            <Select
              label="Adres Bilgileri"
              value={formData.customerAddressId || ''}
              onChange={(e) => onChange('customerAddressId', e.target.value)}
              options={[
                { value: '', label: 'Seçiniz' },
                ...customerAddresses.map(a => ({
                  value: a.id,
                  label: `${a.name} - ${a.address}, ${a.district}/${a.city}`
                }))
              ]}
              fullWidth
            />
          </div>
        )}
      </div>
    </div>
  );
}
