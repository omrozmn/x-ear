import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Autocomplete, type AutocompleteOption } from '@x-ear/ui-web';
import { Building2, User, MapPin, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import type { SupplierExtended } from './supplier-search.types';
import { useAutoFillSupplier } from '../../hooks/useAutoFillSupplier';
import citiesDataRaw from '../../data/cities.json';
import countriesData from '../../data/countries.json';

// Extract cities array from the JSON structure
interface CityData {
  name: string;
  districts?: string[];
}
const citiesData = (citiesDataRaw as unknown as { cities: CityData[] }).cities || [];

// Convert to Autocomplete options
const countryOptions: AutocompleteOption[] = countriesData.map(c => ({
  id: c.code,
  label: c.name,
  value: c.code
}));

const cityOptions: AutocompleteOption[] = citiesData.map((c) => ({
  id: c.name,
  label: c.name,
  value: c.name
}));

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<SupplierExtended, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>) => Promise<void>;
  supplier?: SupplierExtended | null;
  isLoading?: boolean;
}

export function SupplierFormModal({
  isOpen,
  onClose,
  onSave,
  supplier,
  isLoading = false
}: SupplierFormModalProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    companyCode: '',
    taxNumber: '',
    taxOffice: '',
    contactPerson: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    address: '',
    city: '',
    district: '',
    country: 'TR',
    postalCode: '',
    notes: '',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  const isTurkey = formData.country === 'TR';
  const districts = selectedCity?.districts || [];

  useEffect(() => {
    if (supplier) {
      setFormData({
        companyName: supplier.companyName || '',
        companyCode: supplier.companyCode || '',
        taxNumber: supplier.taxNumber || '',
        taxOffice: supplier.taxOffice || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        mobile: supplier.mobile || '',
        website: supplier.website || '',
        address: supplier.address || '',
        city: supplier.city || '',
        district: supplier.district || '',
        country: supplier.country || 'TR',
        postalCode: supplier.postalCode || '',

        notes: supplier.notes || '',
        isActive: supplier.isActive !== false
      });

      if (supplier.city) {
        const city = citiesData.find((c) => c.name === supplier.city);
        setSelectedCity(city || null);
      }
    } else {
      setFormData({
        companyName: '',
        companyCode: '',
        taxNumber: '',
        taxOffice: '',
        contactPerson: '',
        email: '',
        phone: '',
        mobile: '',
        website: '',
        address: '',
        city: '',
        district: '',
        country: 'TR',
        postalCode: '',

        notes: '',
        isActive: true
      });
      setSelectedCity(null);
    }
    setErrors({});
  }, [supplier, isOpen]);

  // Auto-fill supplier details from invoice data
  const { autoFillData, hasData: hasAutoFill } = useAutoFillSupplier(
    formData.taxNumber || undefined,
    formData.companyName || undefined,
  );

  const handleAutoFill = () => {
    if (!autoFillData) return;
    setFormData(prev => ({
      ...prev,
      companyName: autoFillData.companyName || prev.companyName,
      taxOffice: autoFillData.taxOffice || prev.taxOffice,
      address: autoFillData.address || prev.address,
      city: autoFillData.city || prev.city,
    }));
    toast.success('Fatura bilgileri otomatik olarak dolduruldu');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Şirket adı zorunludur';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      // Remove district field (not supported by backend)
      // Add name field (required by SupplierExtended) as companyName
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { district, ...rest } = formData;
      const dataToSend = {
        ...rest,
        name: formData.companyName, // Map companyName to name for API compatibility
      };
      await onSave(dataToSend);
      onClose();
    } catch (error) {
      console.error('Failed to save supplier:', error);
    }
  };

  const handleChange = (field: string, value: string | number | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    if (field === 'city' && isTurkey) {
      const city = citiesData.find((c) => c.name === value);
      setSelectedCity(city || null);
      setFormData(prev => ({ ...prev, district: '' }));
    }

    if (field === 'country') {
      if (value !== 'TR') {
        setFormData(prev => ({ ...prev, city: '', district: '' }));
        setSelectedCity(null);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? 'Tedarikçiyi Düzenle' : 'Yeni Tedarikçi'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Şirket Bilgileri
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şirket Adı *
              </label>
              <Input
                fullWidth
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="Şirket adını giriniz"
                error={errors.companyName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <Input
                fullWidth
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vergi Numarası
              </label>
              <div className="flex gap-2">
                <Input
                  fullWidth
                  value={formData.taxNumber}
                  onChange={(e) => handleChange('taxNumber', e.target.value)}
                  placeholder="10 haneli vergi numarası"
                  className="flex-1"
                />
                {hasAutoFill && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFill}
                    className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 whitespace-nowrap mt-0 self-end"
                    title="Fatura bilgilerinden otomatik doldur"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Otomatik Doldur
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şirket Kodu
              </label>
              <Input
                fullWidth
                value={formData.companyCode}
                onChange={(e) => handleChange('companyCode', e.target.value)}
                placeholder="Örn: SUP001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vergi Dairesi
              </label>
              <Input
                fullWidth
                value={formData.taxOffice}
                onChange={(e) => handleChange('taxOffice', e.target.value)}
                placeholder="Vergi dairesi adı"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durum
              </label>
              <select
                data-allow-raw="true"
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => handleChange('isActive', e.target.value === 'active')}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            İletişim Bilgileri
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yetkili Kişi
              </label>
              <Input
                fullWidth
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                placeholder="İsim soyisim"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-posta
              </label>
              <Input
                fullWidth
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="ornek@email.com"
                error={errors.email}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <Input
                fullWidth
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="0212 XXX XX XX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobil
              </label>
              <Input
                fullWidth
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', e.target.value)}
                placeholder="0532 XXX XX XX"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Adres Bilgileri
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Autocomplete
                label="Ülke"
                options={countryOptions}
                value={countryOptions.find(c => c.value === formData.country) || null}
                onChange={(option) => handleChange('country', option?.value || 'TR')}
                placeholder="Ülke seçiniz veya arayın..."
                minSearchLength={0}
              />
            </div>

            <div>
              {isTurkey ? (
                <Autocomplete
                  label="İl"
                  options={cityOptions}
                  value={cityOptions.find(c => c.value === formData.city) || null}
                  onChange={(option) => handleChange('city', option?.value || '')}
                  placeholder="İl seçiniz veya arayın..."
                  minSearchLength={0}
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şehir
                  </label>
                  <Input
                    fullWidth
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Şehir giriniz"
                  />
                </div>
              )}
            </div>

            <div>
              {isTurkey ? (
                <Autocomplete
                  label="İlçe"
                  options={districts.map((d: string) => ({ id: d, label: d, value: d }))}
                  value={districts.find((d: string) => d === formData.district) ? { id: formData.district, label: formData.district, value: formData.district } : null}
                  onChange={(option) => handleChange('district', option?.value || '')}
                  placeholder={selectedCity ? "İlçe seçiniz veya arayın..." : "Önce il seçiniz"}
                  disabled={!selectedCity}
                  minSearchLength={0}
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bölge
                  </label>
                  <Input
                    fullWidth
                    value={formData.district}
                    onChange={(e) => handleChange('district', e.target.value)}
                    placeholder="Bölge giriniz"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posta Kodu
              </label>
              <Input
                fullWidth
                value={formData.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                placeholder="34000"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea
                data-allow-raw="true"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Tam adres giriniz"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <textarea
            data-allow-raw="true"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="İlave notlar..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Kaydediliyor...' : supplier ? 'Güncelle' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}