import React, { useState, useEffect, useCallback } from 'react';
import { Patient } from '../../types/patient';

interface PatientFormData {
  firstName?: string;
  lastName?: string;
  phone: string;
  tcNumber?: string;
  birthDate?: string;
  email?: string;
  address?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  segment?: 'NEW' | 'TRIAL' | 'PURCHASED' | 'CONTROL' | 'RENEWAL' | 'EXISTING' | 'VIP';
  label?: 'yeni' | 'arama-bekliyor' | 'randevu-verildi' | 'deneme-yapildi' | 'kontrol-hastasi' | 'satis-tamamlandi';
  acquisitionType?: 'tabela' | 'sosyal-medya' | 'tanitim' | 'referans' | 'diger';
  tags?: string[];
}

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Patient>) => Promise<Patient | null>;
  initialData?: Patient | null;
  title?: string;
  className?: string;
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
  initialData,
  title,
  className = ''
}: PatientFormModalProps): JSX.Element | null {
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    tcNumber: '',
    birthDate: '',
    email: '',
    address: '',
    status: 'ACTIVE',
    segment: 'NEW',
    label: 'yeni',
    acquisitionType: 'tabela',
    tags: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        phone: initialData.phone || '',
        tcNumber: initialData.tcNumber || '',
        birthDate: initialData.birthDate || '',
        email: initialData.email || '',
        address: initialData.address || '',
        status: initialData.status || 'ACTIVE',
        segment: initialData.segment || 'NEW',
        label: initialData.label || 'yeni',
        acquisitionType: initialData.acquisitionType || 'tabela',
        tags: initialData.tags || []
      });
      setTagsInput(initialData.tags?.join(', ') || '');
    } else {
      // Reset form for new patient
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        tcNumber: '',
        birthDate: '',
        email: '',
        address: '',
        status: 'ACTIVE',
        segment: 'NEW',
        label: 'yeni',
        acquisitionType: 'tabela',
        tags: []
      });
      setTagsInput('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Telefon numarası gereklidir';
    } else if (!/^[\d\s\-\(\)\+]+$/.test(formData.phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    // TC Number validation
    if (formData.tcNumber && formData.tcNumber.length !== 11) {
      newErrors.tcNumber = 'TC Kimlik No 11 haneli olmalıdır';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    // Birth date validation
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birthDate = 'Doğum tarihi bugünden sonra olamaz';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof PatientFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  const handleTagsChange = useCallback((value: string) => {
    setTagsInput(value);
    const tags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    
    setFormData(prev => ({
      ...prev,
      tags
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit(formData);
      if (result) {
        onClose();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit, onClose]);

  const updateFormField = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${className}`}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Hasta adı"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soyad
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Hasta soyadı"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0555 123 45 67"
                  required
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ornek@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Identity Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TC Kimlik No
                </label>
                <input
                  type="text"
                  value={formData.tcNumber}
                  onChange={(e) => handleInputChange('tcNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="12345678901"
                  maxLength={11}
                />
                {errors.tcNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.tcNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doğum Tarihi
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.birthDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Hasta adresi"
              />
            </div>

            {/* Classification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durum
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Segment
                </label>
                <select
                  value={formData.segment}
                  onChange={(e) => handleInputChange('segment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="NEW">Yeni</option>
                  <option value="TRIAL">Deneme</option>
                  <option value="PURCHASED">Satın Almış</option>
                  <option value="CONTROL">Kontrol</option>
                  <option value="RENEWAL">Yenileme</option>
                  <option value="EXISTING">Mevcut</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etiket
                </label>
                <select
                  value={formData.label}
                  onChange={(e) => handleInputChange('label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="yeni">Yeni</option>
                  <option value="arama-bekliyor">Arama Bekliyor</option>
                  <option value="randevu-verildi">Randevu Verildi</option>
                  <option value="deneme-yapildi">Deneme Yapıldı</option>
                  <option value="kontrol-hastasi">Kontrol Hastası</option>
                  <option value="satis-tamamlandi">Satış Tamamlandı</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kazanım Türü
                </label>
                <select
                  value={formData.acquisitionType}
                  onChange={(e) => handleInputChange('acquisitionType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="tabela">Tabela</option>
                  <option value="sosyal-medya">Sosyal Medya</option>
                  <option value="tanitim">Tanıtım</option>
                  <option value="referans">Referans</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Etiketler
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => handleTagsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Etiketleri virgülle ayırın (örn: vip, acil, takip)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Etiketleri virgülle ayırarak giriniz
              </p>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Kaydet')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}