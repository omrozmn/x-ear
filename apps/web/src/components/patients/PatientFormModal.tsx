import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Patient, PatientStatus } from '../../types/patient';
import { validateTcNumber } from '@x-ear/core';
import {
  Input,
  Textarea,
  Button,
  DatePicker,
  Modal,
  Autocomplete
} from '@x-ear/ui-web';
import type { AutocompleteOption } from '@x-ear/ui-web';
import citiesData from '../../data/cities.json';
import { useListBranches } from '../../api/generated/branches/branches';
import { BranchRead } from '../../api/generated/schemas';
import { unwrapArray } from '../../utils/response-unwrap';

interface PatientFormData {
  firstName?: string;
  lastName?: string;
  phone: string;
  tcNumber?: string;
  gender?: string;
  birthDate?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  status?: PatientStatus;
  segment?: string;
  acquisitionType?: string;
  branchId?: string;
  tags?: string[];
}

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Patient>) => Promise<Patient | null>;
  initialData?: Patient | null;
  title?: string;
  className?: string;
  isLoading?: boolean;
}

/**
 * PatientFormModal Component
 * Modal form for creating and editing patients
 * Follows 500 LOC limit and single responsibility principle
 */
export function PatientFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading: externalLoading,
  initialData,
  title,
  className = ''
}: PatientFormModalProps): JSX.Element | null {
  // Fetch branches
  const { data: branchesData } = useListBranches();
  const branches = unwrapArray<BranchRead>(branchesData);

  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    tcNumber: '',
    birthDate: '',
    email: '',
    address: '',
    city: '',
    district: '',
    status: 'ACTIVE',
    segment: 'NEW',
    acquisitionType: 'tabela',
    tags: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // City options for dropdown
  const cityOptions = useMemo<AutocompleteOption[]>(() => {
    return citiesData.cities.map(city => ({
      id: city.name,
      value: city.name,
      label: city.name
    }));
  }, []);

  // District options based on selected city
  const districtOptions = useMemo<AutocompleteOption[]>(() => {
    if (!formData.city) return [];
    const selectedCity = citiesData.cities.find(c => c.name === formData.city);
    if (!selectedCity) return [];
    return selectedCity.districts.map(district => ({
      id: district,
      value: district,
      label: district
    }));
  }, [formData.city]);

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        phone: initialData.phone || '',
        tcNumber: initialData.tcNumber || '',
        gender: initialData.gender || '',
        birthDate: initialData.birthDate || '',
        email: initialData.email || '',
        address: typeof initialData.address === 'string' ? initialData.address : initialData.addressFull || '',
        city: typeof initialData.address === 'object' ? initialData.address?.city : initialData.addressCity || '',
        district: typeof initialData.address === 'object' ? initialData.address?.district : initialData.addressDistrict || '',
        status: initialData.status || 'ACTIVE',
        segment: initialData.segment || '',
        acquisitionType: initialData.acquisitionType || '',
        branchId: (initialData as any).branchId || '',
        tags: initialData.tags || []
      });
    } else {
      // Reset form for new patient
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        tcNumber: '',
        gender: '',
        birthDate: '',
        email: '',
        address: '',
        city: '',
        district: '',
        status: 'ACTIVE',
        segment: 'NEW',
        acquisitionType: 'tabela',
        branchId: '',
        tags: []
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'Ad gereklidir';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Soyad gereklidir';
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Telefon numarası gereklidir';
    } else if (!/^[\d\s\-()+]+$/.test(formData.phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    // TC Number validation (optional)
    if (formData.tcNumber?.trim()) {
      const isValid = validateTcNumber(formData.tcNumber.trim());
      console.log('TC Validation - Input:', formData.tcNumber, 'Valid:', isValid);
      if (!isValid) {
        newErrors.tcNumber = 'Geçerli bir TC Kimlik numarası giriniz (11 haneli)';
      }
    }

    // gender is optional; if provided, normalize
    if (formData.gender && !['M', 'F', 'm', 'f', 'male', 'female', 'erkek', 'kadın'].includes(String(formData.gender))) {
      // allow free-form but no hard validation
    }

    // Email validation (optional)
    if (formData.email?.trim()) {
      const email = formData.email.trim();
      if (!email.includes('@')) {
        newErrors.email = 'E-posta adresi @ içermelidir';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = 'Geçerli bir e-posta adresi giriniz (\u00f6rn: ornek@email.com)';
      }
    }

    // Birth date validation (optional)
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birthDate = 'Doğum tarihi bugünden sonra olamaz';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors || {}).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof PatientFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    // Clear previous errors
    setErrors({});

    try {
      // Clean formData: convert empty strings to undefined/null for optional fields
      // Also normalize status to lowercase for backend compatibility
      const cleanedData = {
        firstName: formData.firstName?.trim(),
        lastName: formData.lastName?.trim(),
        phone: formData.phone?.trim(),
        tcNumber: formData.tcNumber?.trim() || undefined,
        gender: formData.gender?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        birthDate: formData.birthDate?.trim() || undefined,
        // Don't send address as empty string - backend expects object or undefined
        addressFull: formData.address?.trim() || undefined,
        // Send both formats for backend compatibility
        city: formData.city?.trim() || undefined,
        district: formData.district?.trim() || undefined,
        addressCity: formData.city?.trim() || undefined,
        addressDistrict: formData.district?.trim() || undefined,
        branchId: formData.branchId?.trim() || undefined,
        acquisitionType: formData.acquisitionType?.trim() || undefined,
        // Normalize status to lowercase for backend enum compatibility
        status: formData.status?.toLowerCase() || 'active',
        segment: formData.segment || 'lead',
        tags: formData.tags || [],
      };

      console.log('=== FORM SUBMIT DATA ===');
      console.log('cleanedData:', cleanedData);

      const result = await onSubmit(cleanedData as any);
      if (result) {
        onClose();
      }
    } catch (error: any) {
      console.error('Form submission error:', error);

      // Check error structure comprehensively
      const status = error?.response?.status || error?.status;
      const errorData = error?.response?.data || error?.data;
      const errorMsg = errorData?.error || errorData?.message || error?.message;

      console.log('Error status:', status);
      console.log('Error message:', errorMsg);
      console.log('Full error:', JSON.stringify(error, null, 2));

      // Backend validation errors (400)
      if (status === 400) {
        if (errorMsg && typeof errorMsg === 'string') {
          if (errorMsg.toLowerCase().includes('telefon') || errorMsg.toLowerCase().includes('phone')) {
            setErrors({ phone: errorMsg });
          } else if (errorMsg.toLowerCase().includes('tc') || errorMsg.toLowerCase().includes('kimlik')) {
            setErrors({ tcNumber: errorMsg });
          } else if (errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('e-posta')) {
            setErrors({ email: errorMsg });
          } else {
            setErrors({ submit: errorMsg });
          }
        } else {
          setErrors({ submit: 'Validasyon hatası' });
        }
        return;
      }

      // Backend duplicate errors (409 Conflict)
      if (status === 409) {
        if (errorMsg && typeof errorMsg === 'string') {
          if (errorMsg.toLowerCase().includes('tc') || errorMsg.toLowerCase().includes('kimlik')) {
            setErrors({ tcNumber: 'Bu TC Kimlik numarası zaten kayıtlı' });
          } else if (errorMsg.toLowerCase().includes('telefon') || errorMsg.toLowerCase().includes('phone')) {
            setErrors({ phone: 'Bu telefon numarası zaten kayıtlı' });
          } else if (errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('e-posta')) {
            setErrors({ email: 'Bu e-posta adresi zaten kayıtlı' });
          } else {
            setErrors({ submit: errorMsg });
          }
        } else {
          setErrors({ submit: 'Bu kayıt zaten mevcut' });
        }
        return;
      }

      // Generic error message
      if (errorMsg && typeof errorMsg === 'string') {
        // Try to match field-specific errors
        if (errorMsg.toLowerCase().includes('telefon') || errorMsg.toLowerCase().includes('phone')) {
          setErrors({ phone: errorMsg });
        } else if (errorMsg.toLowerCase().includes('tc') || errorMsg.toLowerCase().includes('kimlik')) {
          setErrors({ tcNumber: errorMsg });
        } else if (errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('e-posta')) {
          setErrors({ email: errorMsg });
        } else {
          setErrors({ submit: errorMsg });
        }
      } else {
        setErrors({ submit: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit, onClose]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="xl"
      showFooter={false}
      className={className}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Kişisel Bilgiler</h3>

          {/* Row 1: TC Kimlik No (left) + Cinsiyet (right) - align with other two-column rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TC Kimlik No
              </label>
              <Input
                type="text"
                value={formData.tcNumber}
                onChange={(e) => handleInputChange('tcNumber', e.target.value)}
                placeholder="12345678901"
                maxLength={11}
                className="h-10 w-full"
              />
              {errors.tcNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.tcNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cinsiyet</label>
              <div className="flex items-center space-x-2 mt-1">
                <Button
                  type="button"
                  variant={formData.gender && String(formData.gender).toUpperCase() === 'M' ? 'primary' : 'outline'}
                  onClick={() => handleInputChange('gender', 'M')}
                  className="h-9"
                >
                  Erkek
                </Button>
                <Button
                  type="button"
                  variant={formData.gender && String(formData.gender).toUpperCase() === 'F' ? 'primary' : 'outline'}
                  onClick={() => handleInputChange('gender', 'F')}
                  className="h-9"
                >
                  Kadın
                </Button>
              </div>
            </div>
          </div>

          {/* Row 2: Ad, Soyad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ad <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Hasta adı"
                className="h-10 w-full"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Soyad <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Hasta soyadı"
                className="h-10 w-full"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Row 2: Telefon + Doğum Tarihi (swapped) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefon <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="0555 123 45 67"
                className="h-10 w-full"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <DatePicker
                label="Doğum Tarihi"
                value={formData.birthDate ? new Date(formData.birthDate) : undefined}
                onChange={(date) => handleInputChange('birthDate', date ? date.toISOString().split('T')[0] : '')}
                placeholder="GG/AA/YYYY"
                className="h-10"
                error={errors.birthDate}
              />
            </div>
          </div>

          {/* Row 3: İl, İlçe (moved above address and email) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Autocomplete
                label="İl"
                options={cityOptions}
                value={cityOptions.find(c => c.value === formData.city) || null}
                onChange={(option) => {
                  handleInputChange('city', option?.value || '');
                  setFormData(prev => ({ ...prev, district: '' }));
                }}
                placeholder="İl seçiniz"
                allowClear
                minSearchLength={0}
                maxResults={100}
                className="h-10"
              />
            </div>

            <div>
              <Autocomplete
                label="İlçe"
                options={districtOptions}
                value={districtOptions.find(d => d.value === formData.district) || null}
                onChange={(option) => handleInputChange('district', option?.value || '')}
                placeholder={formData.city ? 'İlçe seçiniz' : 'Önce İl Seçiniz'}
                disabled={!formData.city}
                allowClear
                minSearchLength={0}
                maxResults={200}
                className="h-10"
              />
            </div>
          </div>

          {/* Row 4: Adres (left) + E-posta (right) (email moved under address) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adres
              </label>
              <Textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Mahalle, sokak, bina no"
                rows={2}
                className="resize-none w-full"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-posta
              </label>
              <Input
                type="text"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="ornek@email.com"
                className="h-10 w-full"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>

          {/* (moved) Address field consolidated above with Doğum Tarihi */}

          {/* Row 6: Durum, Segment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Durum
              </label>
              <div className="relative">
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as any)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Segment
              </label>
              <div className="relative">
                <select
                  value={formData.segment}
                  onChange={(e) => handleInputChange('segment', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="NEW">Yeni</option>
                  <option value="TRIAL">Deneme</option>
                  <option value="PURCHASED">Satın Almış</option>
                  <option value="CONTROL">Kontrol</option>
                  <option value="RENEWAL">Yenileme</option>
                  <option value="EXISTING">Mevcut</option>
                  <option value="VIP">VIP</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Row 7: Kazanım Türü, Şube */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kazanım Türü
              </label>
              <div className="relative">
                <select
                  value={formData.acquisitionType}
                  onChange={(e) => handleInputChange('acquisitionType', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="referral">Referans</option>
                  <option value="online">Online</option>
                  <option value="walk-in">Ziyaret</option>
                  <option value="social-media">Sosyal Medya</option>
                  <option value="advertisement">Reklam</option>
                  <option value="tabela">Tabela</option>
                  <option value="other">Diğer</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Şube
              </label>
              <div className="relative">
                <select
                  value={formData.branchId}
                  onChange={(e) => handleInputChange('branchId', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Seçiniz</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting || externalLoading}
            variant="ghost"
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || externalLoading}
            variant="primary"
          >
            {(isSubmitting || externalLoading) ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Kaydet')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}