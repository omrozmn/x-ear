import React from 'react';
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
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Alert,
  AlertDescription,
} from '@x-ear/ui-web';

// Quick appointment schema - minimal required fields
const quickAppointmentSchema = z.object({
  patientName: z.string().min(1, 'Hasta adı zorunludur'),
  time: z.string().min(1, 'Saat seçimi zorunludur'),
  type: z.enum(['consultation', 'follow_up', 'trial', 'delivery', 'control_visit', 'battery_renewal', 'repair', 'fitting', 'assessment'], { required_error: 'Randevu türü seçimi zorunludur' }),
  duration: z.number().min(15).max(240).default(30),
});

type QuickAppointmentFormData = z.infer<typeof quickAppointmentSchema>;

interface AppointmentQuickModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: QuickAppointmentFormData & { date: Date }) => Promise<void>;
  selectedDate: Date;
  selectedTime?: string;
  isLoading?: boolean;
  error?: string | null;
}

// Time slots for quick scheduling
const TIME_SLOTS = [
  { value: '08:00', label: '08:00' },
  { value: '08:30', label: '08:30' },
  { value: '09:00', label: '09:00' },
  { value: '09:30', label: '09:30' },
  { value: '10:00', label: '10:00' },
  { value: '10:30', label: '10:30' },
  { value: '11:00', label: '11:00' },
  { value: '11:30', label: '11:30' },
  { value: '12:00', label: '12:00' },
  { value: '12:30', label: '12:30' },
  { value: '13:00', label: '13:00' },
  { value: '13:30', label: '13:30' },
  { value: '14:00', label: '14:00' },
  { value: '14:30', label: '14:30' },
  { value: '15:00', label: '15:00' },
  { value: '15:30', label: '15:30' },
  { value: '16:00', label: '16:00' },
  { value: '16:30', label: '16:30' },
  { value: '17:00', label: '17:00' },
  { value: '17:30', label: '17:30' },
  { value: '18:00', label: '18:00' },
];

const APPOINTMENT_TYPES = [
  { value: 'consultation', label: 'Konsültasyon' },
  { value: 'follow_up', label: 'Kontrol' },
  { value: 'trial', label: 'Deneme' },
  { value: 'delivery', label: 'Teslimat' },
  { value: 'control_visit', label: 'Kontrol Ziyareti' },
  { value: 'battery_renewal', label: 'Pil Yenileme' },
  { value: 'repair', label: 'Tamir' },
  { value: 'fitting', label: 'Uyum' },
  { value: 'assessment', label: 'Değerlendirme' },
];

const DURATION_OPTIONS = [
  { value: '15', label: '15 dk' },
  { value: '30', label: '30 dk' },
  { value: '45', label: '45 dk' },
  { value: '60', label: '1 saat' },
];

export function AppointmentQuickModal({ 
  open, 
  onClose, 
  onSubmit, 
  selectedDate,
  selectedTime,
  isLoading = false,
  error = null,
}: AppointmentQuickModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickAppointmentFormData>({
    resolver: zodResolver(quickAppointmentSchema),
    defaultValues: {
      patientName: '',
      time: selectedTime || '09:00',
      type: 'consultation',
      duration: 30,
    },
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      reset({
        patientName: '',
        time: selectedTime || '09:00',
        type: 'consultation',
        duration: 30,
      });
    }
  }, [open, selectedTime, reset]);

  const handleFormSubmit = async (data: QuickAppointmentFormData) => {
    try {
      await onSubmit({ ...data, date: selectedDate });
      onClose();
    } catch (err) {
      console.error('Quick appointment submission error:', err);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} size="md">
      <div className="p-6">
        <div className="mb-6">
          <Text className="text-xl font-semibold">
            Hızlı Randevu
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            {format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
          </Text>
        </div>

        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <VStack spacing="md">
            {/* Patient Name */}
            <FormControl className="w-full">
              <FormLabel>Hasta Adı *</FormLabel>
              <Controller
                name="patientName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Hasta adını girin"
                    error={errors.patientName?.message}
                    autoFocus
                  />
                )}
              />
            </FormControl>

            {/* Time and Type */}
            <HStack spacing="md" className="w-full">
              <FormControl className="flex-1">
                <FormLabel>Saat *</FormLabel>
                <Controller
                  name="time"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      {...field}
                      options={TIME_SLOTS}
                      placeholder="Saat seçin"
                      error={errors.time?.message}
                    />
                  )}
                />
              </FormControl>

              <FormControl className="flex-1">
                <FormLabel>Tür *</FormLabel>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      {...field}
                      options={APPOINTMENT_TYPES}
                      placeholder="Tür seçin"
                      error={errors.type?.message}
                    />
                  )}
                />
              </FormControl>
            </HStack>

            {/* Duration */}
            <FormControl className="w-full">
              <FormLabel>Süre</FormLabel>
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <Select 
                    value={field.value?.toString()}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    options={DURATION_OPTIONS}
                    placeholder="Süre seçin"
                  />
                )}
              />
            </FormControl>
          </VStack>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
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
              Kaydet
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}