import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Clock, User, Edit, Trash2, Phone } from 'lucide-react';
import { Card, Badge, Button, Text, HStack, VStack } from '@x-ear/ui-web';
import { Appointment } from '../../types/appointment';

interface AppointmentCardProps {
  appointment: Appointment;
  isDragging?: boolean;
  isCompact?: boolean;
  showDate?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCall?: () => void;
  className?: string;
}

// Status variant mapping
const statusVariants = {
  scheduled: 'default',
  confirmed: 'success',
  completed: 'secondary',
  cancelled: 'danger',
  no_show: 'warning',
  rescheduled: 'warning',
} as const;

// Type variant mapping
const typeVariants = {
  consultation: 'primary',
  follow_up: 'secondary',
  trial: 'success',
  delivery: 'warning',
  control_visit: 'primary',
  battery_renewal: 'warning',
  repair: 'danger',
  fitting: 'primary',
  assessment: 'secondary',
} as const;

// Status labels
const statusLabels = {
  scheduled: 'Planlandı',
  confirmed: 'Onaylandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
  no_show: 'Gelmedi',
  rescheduled: 'Ertelendi',
} as const;

// Type labels
const typeLabels = {
  consultation: 'Konsültasyon',
  follow_up: 'Kontrol',
  trial: 'Deneme',
  delivery: 'Teslimat',
  control_visit: 'Kontrol Ziyareti',
  battery_renewal: 'Pil Yenileme',
  repair: 'Tamir',
  fitting: 'Uyum',
  assessment: 'Değerlendirme',
} as const;

export function AppointmentCard({
  appointment,
  isDragging = false,
  isCompact = false,
  showDate = false,
  onClick,
  onEdit,
  onDelete,
  onCall,
  className = '',
}: AppointmentCardProps) {
  const statusVariant = statusVariants[appointment.status] || 'default';
  const typeVariant = typeVariants[appointment.type] || 'default';
  
  const cardClasses = [
    'transition-all duration-200',
    isDragging ? 'shadow-lg scale-105 rotate-1' : 'hover:shadow-md',
    onClick ? 'cursor-pointer' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.();
  };

  if (isCompact) {
    return (
      <Card 
        className={cardClasses}
        onClick={handleCardClick}
      >
        <div className="p-2">
          <HStack spacing="xs" className="items-center">
            <div className="flex-1 min-w-0">
              <Text className="text-sm font-medium truncate">
                {appointment.patientName}
              </Text>
              <Text className="text-xs text-gray-500">
                {appointment.time}
              </Text>
            </div>
            <Badge 
              variant={statusVariant}
              className="text-xs"
            >
              {statusLabels[appointment.status]}
            </Badge>
          </HStack>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cardClasses}
      onClick={handleCardClick}
    >
      <div className="p-4">
        <VStack spacing="sm">
          {/* Header */}
          <HStack spacing="sm" className="items-start justify-between">
            <div className="flex-1 min-w-0">
              <HStack spacing="xs" className="items-center mb-1">
                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <Text className="font-medium truncate">
                  {appointment.patientName}
                </Text>
              </HStack>
              
              <HStack spacing="xs" className="items-center text-sm text-gray-600">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <Text>
                  {showDate && format(new Date(appointment.date), 'dd MMM', { locale: tr })} {appointment.time}
                </Text>
                {appointment.duration && (
                  <Text className="text-xs">
                    ({appointment.duration} dk)
                  </Text>
                )}
              </HStack>
            </div>

            <VStack spacing="xs" className="items-end">
              <Badge 
                variant={statusVariant}
                className="text-xs"
              >
                {statusLabels[appointment.status]}
              </Badge>
              <Badge 
                variant={typeVariant}
                className="text-xs"
              >
                {typeLabels[appointment.type]}
              </Badge>
            </VStack>
          </HStack>

          {/* Notes */}
          {appointment.notes && (
            <Text className="text-sm text-gray-600 line-clamp-2">
              {appointment.notes}
            </Text>
          )}

          {/* Actions */}
          {(onEdit || onDelete || onCall) && (
            <HStack spacing="xs" className="pt-2 border-t">
              {onCall && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall();
                  }}
                  className="flex-1"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Ara
                </Button>
              )}
              
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Düzenle
                </Button>
              )}
              
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Sil
                </Button>
              )}
            </HStack>
          )}
        </VStack>
      </div>
    </Card>
  );
}