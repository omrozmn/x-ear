import { Button, Input, Textarea, Select, useToastHelpers, DatePicker } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { Appointment, CreateAppointmentData, UpdateAppointmentData, AppointmentType, AppointmentStatus } from '../../types/appointment';
import { useAppointments } from '../../hooks/useAppointments';
import { useParties } from '../../hooks/useParties';
import { PartyAutocomplete } from './PartyAutocomplete';
import { getCurrentUserId } from '@/utils/auth-utils';
import { Gender } from '../../api/generated/schemas/gender';
import { PartyStatus } from '../../api/generated/schemas/partyStatus';
import { useTranslation } from 'react-i18next';

interface AppointmentFormProps {
  appointment?: Appointment;
  partyId?: string;
  onSave?: (appointment: Appointment) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  initialDate?: string;
  initialTime?: string;
  className?: string;
}

interface FormData {
  partyId: string;
  partyName: string;
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  title: string;
  notes: string;
  clinician: string;
  clinicianId: string;
  location: string;
  branchId: string;
}

interface FormErrors {
  partyId?: string;
  date?: string;
  time?: string;
  duration?: string;
  type?: string;
  title?: string;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointment,
  partyId,
  onSave,
  onCancel,
  mode = 'create',
  initialDate,
  initialTime,
  className = ''
}) => {
  const { createAppointment, updateAppointment, creating, updating, error } = useAppointments();
  const { data: partiesData, createParty } = useParties();
  const { parties = [] } = partiesData || {};
  const { success: showSuccess, error: showError } = useToastHelpers();
  const { t } = useTranslation(['appointments', 'common']);

  const [formData, setFormData] = useState<FormData>({
    partyId: partyId || appointment?.partyId || '',
    partyName: appointment?.partyName || '',
    date: appointment?.date || initialDate || new Date().toISOString().split('T')[0],
    time: appointment?.time || initialTime || '09:00',
    duration: appointment?.duration || 30,
    type: appointment?.type || 'consultation',
    status: appointment?.status || 'scheduled',
    title: appointment?.title || '',
    notes: appointment?.notes || '',
    clinician: appointment?.clinician || '',
    clinicianId: appointment?.clinicianId || '',
    location: appointment?.location || '',
    branchId: appointment?.branchId || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update party name when party is selected
  useEffect(() => {
    if (formData.partyId && parties.length > 0) {
      const selectedParty = parties.find(p => p.id === formData.partyId);
      if (selectedParty) {
        const partyName = selectedParty.firstName && selectedParty.lastName
          ? `${selectedParty.firstName} ${selectedParty.lastName}`
          : `${selectedParty.firstName || selectedParty.lastName || 'İsimsiz Hasta'}`;

        setFormData(prev => ({ ...prev, partyName }));
      }
    }
  }, [formData.partyId, parties]);

  // Auto-generate title based on type
  useEffect(() => {
    if (!formData.title || formData.title === getTypeLabel(formData.type)) {
      setFormData(prev => ({ ...prev, title: getTypeLabel(formData.type) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type]);

  const getTypeLabel = (type: AppointmentType): string => {
    return t(`types.${type}`);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.partyId) {
      newErrors.partyId = t('form.errors.patient_required');
    }

    if (!formData.date) {
      newErrors.date = t('form.errors.date_required');
    } else {
      const appointmentDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        newErrors.date = t('form.errors.date_past');
      }
    }

    if (!formData.time) {
      newErrors.time = t('form.errors.time_required');
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.time)) {
      newErrors.time = t('form.errors.time_invalid');
    }

    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = t('form.errors.duration_min');
    } else if (formData.duration > 480) {
      newErrors.duration = t('form.errors.duration_max');
    }

    if (!formData.type) {
      newErrors.type = t('form.errors.type_required');
    }

    // Title is no longer required - auto-generated from type

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddNewParty = async (name: string) => {
    try {
      setIsSubmitting(true);
      // Split name into first and last name
      const parts = name.trim().split(' ');
      const lastName = parts.length > 1 ? parts.pop() || '' : '';
      const firstName = parts.join(' ');

      const newParty = await createParty({
        firstName: firstName || name,
        lastName: lastName || '',
        phone: '',
        email: '',
        gender: Gender.O,
        status: PartyStatus.active,
        segment: 'NEW'
      });

      setFormData(prev => ({
        ...prev,
        partyId: (newParty.id as string) || '',
        partyName: `${(newParty.firstName as string)} ${(newParty.lastName as string)}`.trim()
      }));

      showSuccess(t('form.success.party_create'));
    } catch (error) {
      console.error('Failed to create party:', error);
      showError(t('form.errors.party_create_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const appointmentData: CreateAppointmentData = {
          partyId: formData.partyId,
          partyName: formData.partyName,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          type: formData.type,
          status: formData.status,
          title: formData.title.trim(),
          notes: formData.notes.trim() || undefined,
          clinician: formData.clinician.trim() || undefined,
          clinicianId: formData.clinicianId.trim() || undefined,
          location: formData.location.trim() || undefined,
          branchId: formData.branchId.trim() || undefined,
          createdBy: getCurrentUserId()
        };

        const newAppointment = await createAppointment(appointmentData);
        showSuccess(t('form.success.create'));
        onSave?.(newAppointment);
      } else if (appointment) {
        const updateData: Partial<UpdateAppointmentData> = {
          partyId: formData.partyId,
          partyName: formData.partyName,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          type: formData.type,
          status: formData.status,
          title: formData.title.trim(),
          notes: formData.notes.trim() || undefined,
          clinician: formData.clinician.trim() || undefined,
          clinicianId: formData.clinicianId.trim() || undefined,
          location: formData.location.trim() || undefined,
          branchId: formData.branchId.trim() || undefined
        };

        const updatedAppointment = await updateAppointment(appointment.id, updateData);
        showSuccess(t('form.success.update'));
        onSave?.(updatedAppointment);
      }
    } catch (error) {
      console.error('Failed to save appointment:', error);
      showError(t('form.errors.create_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = creating || updating || isSubmitting;

  return (
    <div className={`appointment-form flex flex-col h-full ${className}`}>
      <form id="appointment-form" onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-6 pb-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{t('error_title')}</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Party Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.patient')}
                </label>
                <PartyAutocomplete
                  value={formData.partyName}
                  partyId={formData.partyId}
                  onSelect={(party) => {
                    handleInputChange('partyId', (party.id as string) || '');
                    handleInputChange('partyName', `${(party.firstName as string)} ${(party.lastName as string)}`);
                  }}
                  onAddNew={handleAddNewParty}
                  placeholder={t('form.patient_placeholder')}
                  error={errors.partyId}
                />
              </div>

              {/* Date */}
              <div>
                <DatePicker
                  label={t('form.date')}
                  value={formData.date ? new Date(formData.date) : undefined}
                  onChange={(date) => handleInputChange('date', date ? date.toISOString().split('T')[0] : '')}
                  placeholder={t('form.date_placeholder')}
                  className={`w-full ${errors.date ? 'border-red-300' : ''}`}
                  error={errors.date}
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.time')}
                </label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.time ? 'border-red-300' : 'border-gray-300'
                    }`}
                />
                {errors.time && (
                  <p className="mt-1 text-sm text-red-600">{errors.time}</p>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.duration')}
                </label>
                <Input
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.duration ? 'border-red-300' : 'border-gray-300'
                    }`}
                />
                {errors.duration && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.type')}
                </label>
                <Select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as AppointmentType)}
                  options={[
                    { value: 'consultation', label: t('types.consultation') },
                    { value: 'follow_up', label: t('types.follow_up') },
                    { value: 'trial', label: t('types.trial') },
                    { value: 'delivery', label: t('types.delivery') },
                    { value: 'control_visit', label: t('types.control_visit') },
                    { value: 'battery_renewal', label: t('types.battery_renewal') },
                    { value: 'repair', label: t('types.repair') },
                    { value: 'fitting', label: t('types.fitting') },
                    { value: 'assessment', label: t('types.assessment') }
                  ]}
                  className={`w-full ${errors.type ? 'border-red-300' : ''}`}
                />
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                )}
              </div>

              {/* Status - COMMENTED OUT */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durum
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as AppointmentStatus)}
                  options={[
                    { value: 'scheduled', label: 'Planlandı' },
                    { value: 'confirmed', label: 'Onaylandı' },
                    { value: 'completed', label: 'Tamamlandı' },
                    { value: 'cancelled', label: 'İptal Edildi' },
                    { value: 'no_show', label: 'Gelmedi' },
                    { value: 'rescheduled', label: 'Ertelendi' }
                  ]}
                  className="w-full"
                />
              </div> */}

              {/* Title - COMMENTED OUT */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlık *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Randevu başlığı"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div> */}

              {/* Clinician - COMMENTED OUT */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doktor
                </label>
                <Input
                  type="text"
                  value={formData.clinician}
                  onChange={(e) => handleInputChange('clinician', e.target.value)}
                  placeholder="Doktor adı"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div> */}

              {/* Location - COMMENTED OUT */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lokasyon
                </label>
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Muayene odası, şube vb."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div> */}

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.notes')}
                </label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder={t('form.notes_placeholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions - Sticky Footer */}
        <div className="flex items-center justify-end space-x-4 pt-4 pb-2 border-t border-gray-200 bg-white sticky bottom-0 z-10 mt-auto">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              variant='default'>
              {t('form.cancel_btn')}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            variant='primary'>
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {mode === 'create' ? t('form.create_btn') : t('form.update_btn')}
          </Button>
        </div>
      </form>
    </div>
  );
};