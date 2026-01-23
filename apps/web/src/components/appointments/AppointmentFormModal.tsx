import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Modal,
  Button,
  Input,
  Select,
  Textarea,
  DatePicker,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Alert,
  AlertDescription,
} from '@x-ear/ui-web';
import { Appointment } from '../../types/appointment';
import { PartyAutocomplete } from './PartyAutocomplete';
import { Party } from '../../types/party/party-base.types';

// Validation schema
const appointmentSchema = z.object({
  partyId: z.string().min(1, 'Hasta seçimi zorunludur'),
  partyName: z.string().min(1, 'Hasta adı zorunludur'),
  date: z.date({ required_error: 'Tarih seçimi zorunludur' }),
  time: z.string().min(1, 'Saat seçimi zorunludur'),
  type: z.enum(['consultation', 'hearing-test', 'device-trial', 'follow-up'], { required_error: 'Randevu türü seçimi zorunludur' }),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled']).default('scheduled'),
  notes: z.string().optional(),
  duration: z.number().min(15).max(240).default(30),
  branchId: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  initialData?: Appointment | null;
  initialDate?: Date;
  initialTime?: string;
  isLoading?: boolean;
  error?: string | null;
}

// Time slots for dropdown (using native time input instead)
// const TIME_SLOTS = [
//   { value: '08:00', label: '08:00' },
//   ... // See component - using native time input
// ];

const APPOINTMENT_TYPES = [
  { value: 'consultation', label: 'Konsültasyon' },
  { value: 'hearing-test', label: 'İşitme Testi' },
  { value: 'device-trial', label: 'Cihaz Denemesi' },
  { value: 'follow-up', label: 'Kontrol' },
];

const APPOINTMENT_STATUSES = [
  { value: 'scheduled', label: 'Planlandı' },
  { value: 'confirmed', label: 'Onaylandı' },
  { value: 'cancelled', label: 'İptal Edildi' },
  { value: 'completed', label: 'Tamamlandı' },
];

const DURATION_OPTIONS = [
  { value: '15', label: '15 dakika' },
  { value: '30', label: '30 dakika' },
  { value: '45', label: '45 dakika' },
  { value: '60', label: '1 saat' },
];

const BRANCH_OPTIONS = [
  { value: 'ana-sube', label: 'Ana Şube' },
  { value: 'sehir-merkezi', label: 'Şehir Merkezi' },
  { value: 'avm', label: 'AVM' },
];

export function AppointmentFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
  initialDate,
  initialTime,
  isLoading = false,
  error = null,
}: AppointmentFormModalProps) {
  const isEditing = !!initialData;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      partyId: '',
      partyName: '',
      date: new Date(),
      time: '09:00',
      type: 'consultation',
      status: 'scheduled',
      notes: '',
      duration: 30,
      branchId: '',
    },
  });

  // Reset form when modal opens/closes or appointment changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          partyId: initialData.partyId,
          partyName: initialData.partyName || '',
          date: new Date(initialData.date),
          time: initialData.time,
          type: initialData.type,
          status: initialData.status,
          notes: initialData.notes || '',
          duration: initialData.duration || 30,
          branchId: initialData.branchId || '',
        });
      } else {
        reset({
          partyId: '',
          partyName: '',
          date: initialDate || new Date(),
          time: initialTime || '09:00',
          type: 'consultation',
          status: 'scheduled',
          notes: '',
          duration: 30,
          branchId: '',
        });
      }
    }
  }, [open, initialData, initialDate, initialTime, reset]);

  const handleFormSubmit = async (data: AppointmentFormData) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const selectedDate = watch('date');

  return (
    <Modal isOpen={open} onClose={handleClose} size="lg">
      <div className="p-6">
        <div className="mb-6">
          <Text className="text-xl font-semibold">
            {isEditing ? 'Randevuyu Düzenle' : 'Yeni Randevu'}
          </Text>
          {selectedDate && (
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
            </Text>
          )}
        </div>

        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <VStack spacing="md">
            {/* Party Information */}
            <FormControl className="w-full">
              <FormLabel className="text-gray-700 dark:text-gray-300">Hasta Arama *</FormLabel>
              <Controller
                name="partyName"
                control={control}
                render={({ field }) => (
                  <PartyAutocomplete
                    value={field.value}
                    onSelect={(party: Party) => {
                      setValue('partyId', party.id || '');
                      setValue('partyName', party.firstName + ' ' + party.lastName);
                    }}
                    placeholder="Hasta adı veya TC ile arayın..."
                    error={errors.partyName?.message}
                    className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  />
                )}
              />
            </FormControl>

            {/* Date and Time */}
            <HStack spacing="md" className="w-full">
              <FormControl className="flex-1">
                <FormLabel className="text-gray-700 dark:text-gray-300">Tarih *</FormLabel>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      minDate={new Date()}
                      error={errors.date?.message}
                    />
                  )}
                />
              </FormControl>

              <FormControl className="flex-1">
                <FormLabel className="text-gray-700 dark:text-gray-300">Saat *</FormLabel>
                <Controller
                  name="time"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="time"
                      placeholder="Saat seçin"
                      error={errors.time?.message}
                      className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  )}
                />
              </FormControl>
            </HStack>

            {/* Type, Duration and Branch */}
            <HStack spacing="md" className="w-full">
              <FormControl className="flex-1">
                <FormLabel className="text-gray-700 dark:text-gray-300">Randevu Türü *</FormLabel>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={APPOINTMENT_TYPES}
                      placeholder="Tür seçin"
                      error={errors.type?.message}
                      className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  )}
                />
              </FormControl>

              <FormControl className="flex-1">
                <FormLabel className="text-gray-700 dark:text-gray-300">Süre</FormLabel>
                <Controller
                  name="duration"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString()}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      options={DURATION_OPTIONS}
                      placeholder="Süre seçin"
                      className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  )}
                />
              </FormControl>

              <FormControl className="flex-1">
                <FormLabel>Şube</FormLabel>
                <Controller
                  name="branchId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={BRANCH_OPTIONS}
                      placeholder="Şube seçin"
                      className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  )}
                />
              </FormControl>
            </HStack>

            {/* Status (only for editing) */}
            {isEditing && (
              <FormControl className="w-full">
                <FormLabel className="text-gray-700 dark:text-gray-300">Durum</FormLabel>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={APPOINTMENT_STATUSES}
                      placeholder="Durum seçin"
                      className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  )}
                />
              </FormControl>
            )}

            {/* Notes */}
            <FormControl className="w-full">
              <FormLabel className="text-gray-700 dark:text-gray-300">Notlar</FormLabel>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Randevu notları..."
                    rows={3}
                    className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  />
                )}
              />
            </FormControl>
          </VStack>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              loading={isSubmitting || isLoading}
            >
              {isEditing ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
