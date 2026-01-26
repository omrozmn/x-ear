import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { PartyStatus, PartySegment, PartyLabel, PartyAcquisitionType, PartyGender, PartyConversionStep } from '../../types/party/party-base.types';
import { Party as ExtendedParty } from '../../types/party';

interface PartyFormProps {
  party?: ExtendedParty | null;
  onSave?: (party: ExtendedParty) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

import { useTranslation } from 'react-i18next';

export function PartyForm({ party, onSave, onCancel }: PartyFormProps) {
  const { t } = useTranslation(['patients', 'common', 'constants']);
  // Removed unused isModal parameter
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    tcNumber: '',
    birthDate: '',
    email: '',
    address: '',
    gender: '' as PartyGender | '',
    branch: '',
    status: 'ACTIVE' as PartyStatus,
    segment: 'NEW' as PartySegment,
    label: 'yeni' as PartyLabel,
    acquisitionType: 'tabela' as PartyAcquisitionType,
    conversionStep: 'lead' as PartyConversionStep,
    tags: [] as string[],
    deviceTrial: false,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (party) {
      setFormData({
        firstName: party.firstName || '',
        lastName: party.lastName || '',
        phone: party.phone || '',
        tcNumber: party.tcNumber || '',
        birthDate: party.birthDate || '',
        email: party.email || '',
        address: party.addressFull || '',
        gender: party.gender || '',
        branch: party.branch || '',
        status: (party.status as PartyStatus) || 'ACTIVE',
        segment: (party.segment as PartySegment) || 'NEW',
        label: (party.label as PartyLabel) || 'yeni',
        acquisitionType: (party.acquisitionType as PartyAcquisitionType) || 'tabela',
        conversionStep: (party.conversionStep as PartyConversionStep) || 'lead',
        tags: party.tags || [],
        deviceTrial: false,
        notes: '',
      });
    }
  }, [party]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('form.errors.first_name_required');
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('form.errors.last_name_required');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('form.errors.phone_required');
    } else if (!/^[0-9+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = t('form.errors.phone_invalid');
    }

    // TC Number validation with checksum (Turkish ID validation)
    if (formData.tcNumber) {
      if (!/^\d{11}$/.test(formData.tcNumber)) {
        newErrors.tcNumber = t('form.errors.tc_length');
      } else if (formData.tcNumber[0] === '0') {
        newErrors.tcNumber = t('form.errors.tc_start_zero');
      } else {
        // Turkish ID checksum validation
        const digits = formData.tcNumber.split('').map(Number);
        const sum = digits.slice(0, 10).reduce((a, b) => a + b, 0);
        if ((sum % 10) !== digits[10]) {
          newErrors.tcNumber = t('form.errors.tc_invalid');
        }
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = t('form.errors.email_invalid');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Narrow form selections into typed fields to avoid unsafe 'as' casts
      const allowedStatus: ExtendedParty['status'][] = ['ACTIVE', 'INACTIVE'];
      const allowedSegment: ExtendedParty['segment'][] = ['NEW', 'TRIAL', 'PURCHASED', 'CONTROL', 'RENEWAL'];
      const allowedLabel: ExtendedParty['label'][] = ['yeni', 'arama-bekliyor', 'randevu-verildi', 'deneme-yapildi', 'kontrol-hastasi', 'satis-tamamlandi'];
      const allowedAcq: ExtendedParty['acquisitionType'][] = ['tabela', 'sosyal-medya', 'tanitim', 'referans', 'diger'];
      // small type-guard helper to avoid inline casts
      const isIn = <T,>(arr: T[], v: unknown): v is T => arr.includes(v as T);

      const statusValue = isIn(allowedStatus, formData.status) ? formData.status : 'ACTIVE';
      const segmentValue = isIn(allowedSegment, formData.segment) ? formData.segment : 'NEW';
      const labelValue = isIn(allowedLabel, formData.label) ? formData.label : 'yeni';
      const acquisitionValue = isIn(allowedAcq, formData.acquisitionType) ? formData.acquisitionType : 'diger';

      const partyData: ExtendedParty = {
        id: party?.id || `party_${Date.now()}`,
        ...formData,
        gender: formData.gender || undefined,
        status: statusValue,
        segment: segmentValue,
        label: labelValue,
        acquisitionType: acquisitionValue,
        // explicitly map address string to addressFull and clear address object to satisfy type
        addressFull: formData.address,
        address: undefined,
        tags: party?.tags || [],
        notes: formData.notes ? [{
          id: Date.now().toString(),
          text: formData.notes,
          date: new Date().toISOString(),
          author: 'User',
          type: 'general' as const,
          isPrivate: false
        }] : [],
        devices: party?.devices || [],
        sales: party?.sales || [],
        communications: party?.communications || [],
        sgkInfo: party?.sgkInfo || {
          id: '',
          partyId: party?.id || '',
          sgkNumber: '',
          insuranceType: 'sgk',
          isActive: false,
          validUntil: undefined,
          coverageDetails: '',
          lastUpdated: new Date()
        },
        createdAt: party?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (onSave) {
        onSave(partyData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.first_name')} *</label>
          <Input
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder={t('form.first_name')}
            error={errors.firstName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('form.last_name')} *</label>
          <Input
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder={t('form.last_name')}
            error={errors.lastName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('form.phone')} *</label>
          <Input
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="0555 123 45 67"
            error={errors.phone}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('form.tc_number')}</label>
          <Input
            value={formData.tcNumber}
            onChange={(e) => handleInputChange('tcNumber', e.target.value)}
            placeholder="12345678901"
            maxLength={11}
            error={errors.tcNumber}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('form.birth_date')}</label>
          <Input
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleInputChange('birthDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('form.email')}</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder={t('form.email')}
            error={errors.email}
          />
        </div>

        <div>
          <Select
            label={t('form.gender')}
            value={formData.gender || ''}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as PartyGender })}
            options={[
              { value: "", label: t('form.gender_options.select') },
              { value: "M", label: t('form.gender_options.male') },
              { value: "F", label: t('form.gender_options.female') }
            ]}
            fullWidth
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('form.branch')}</label>
          <Input
            value={formData.branch}
            onChange={(e) => handleInputChange('branch', e.target.value)}
            placeholder={t('form.branch')}
          />
        </div>

        <div>
          <Select
            label={t('form.status')}
            value={formData.status || ''}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as PartyStatus })}
            options={[
              { value: "ACTIVE", label: t('party.status.active', { ns: 'constants' }) },
              { value: "INACTIVE", label: t('party.status.inactive', { ns: 'constants' }) }
            ]}
            fullWidth
          />
        </div>

        <div>
          <Select
            label={t('form.segment')}
            value={formData.segment}
            onChange={(e) => setFormData({ ...formData, segment: e.target.value as PartySegment })}
            options={[
              { value: "NEW", label: t('party.segment.new', { ns: 'constants' }) },
              { value: "TRIAL", label: t('party.segment.trial', { ns: 'constants' }) },
              { value: "PURCHASED", label: t('party.segment.purchased', { ns: 'constants' }) },
              { value: "CONTROL", label: t('party.segment.control', { ns: 'constants' }) },
              { value: "RENEWAL", label: t('party.segment.renewal', { ns: 'constants' }) }
            ]}
            fullWidth
          />
        </div>

        <div>
          <Select
            label={t('form.conversion_step')}
            value={formData.conversionStep}
            onChange={(e) => setFormData({ ...formData, conversionStep: e.target.value as PartyConversionStep })}
            options={[
              { value: "lead", label: "Potansiyel" }, // Needs translation keys for Conversion Step if critical
              { value: "contacted", label: "İletişim Kuruldu" },
              { value: "appointment-scheduled", label: "Randevu Planlandı" },
              { value: "visited", label: "Ziyaret Edildi" },
              { value: "trial-started", label: "Deneme Başladı" },
              { value: "trial-completed", label: "Deneme Tamamlandı" },
              { value: "purchased", label: "Satın Alındı" },
              { value: "delivered", label: "Teslim Edildi" }
            ]}
            fullWidth
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('form.address')}</label>
        <Textarea
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder={t('form.address')}
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('form.notes')}</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder={t('form.notes')}
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          data-allow-raw="true"
          type="checkbox"
          id="deviceTrial"
          checked={formData.deviceTrial}
          onChange={(e) => handleInputChange('deviceTrial', e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="deviceTrial" className="text-sm">{t('form.device_trial')}</label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('cancel', { ns: 'common' })}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? t('loading', { ns: 'common' }) : (party ? t('save', { ns: 'common' }) : t('add', { ns: 'common' }))}
        </Button>
      </div>
    </form>
  );
}