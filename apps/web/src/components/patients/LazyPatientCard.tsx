import React, { memo, useCallback, useRef, useEffect, useMemo } from 'react';
import { Button, Badge } from '@x-ear/ui-web';
import { 
  User, 
  Phone, 
  Mail, 
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import { Patient } from '../../types/patient';
import { useLazyLoading } from '../../hooks/useVirtualScroll';

interface LazyPatientCardProps {
  patient: Patient;
  isSelected?: boolean;
  onSelect?: (patientId: string) => void;
  onClick?: (patient: Patient) => void;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patient: Patient) => void;
  onCommunication?: (patient: Patient) => void;
  variant?: 'compact' | 'detailed';
  showActions?: boolean;
  className?: string;
}

const LazyPatientCard: React.FC<LazyPatientCardProps> = memo(({
  patient,
  isSelected = false,
  onSelect,
  onClick,
  onEdit,
  onDelete,
  onCommunication,
  variant = 'compact',
  showActions = true,
  className = ''
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const { observerRef, isVisible } = useLazyLoading({
    threshold: 0.1,
    rootMargin: '50px'
  });

  // Set up intersection observer
  useEffect(() => {
    if (cardRef.current && patient.id) {
      const cleanup = observerRef(cardRef.current, patient.id);
      return cleanup;
    }
  }, [observerRef, patient.id]);

  // Format phone number
  const formatPhone = useCallback((phone?: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  }, []);

  // Get patient display name
  const displayName = useMemo(() => {
    if (patient.firstName && patient.lastName) {
      return `${patient.firstName} ${patient.lastName}`;
    }
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'İsimsiz Hasta';
  }, [patient.firstName, patient.lastName]);

  // Get status badge
  const getStatusBadge = useCallback((status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" size="sm">Aktif</Badge>;
      case 'inactive':
        return <Badge variant="warning" size="sm">Pasif</Badge>;
      case 'archived':
        return <Badge variant="secondary" size="sm">Arşiv</Badge>;
      default:
        return <Badge variant="default" size="sm">{status}</Badge>;
    }
  }, []);

  // Get label badge
  const getLabelBadge = useCallback((label?: string) => {
    switch (label) {
      case 'yeni':
        return <Badge variant="primary" size="sm">Yeni</Badge>;
      case 'arama-bekliyor':
        return <Badge variant="warning" size="sm">Arama Bekliyor</Badge>;
      case 'randevu-verildi':
        return <Badge variant="primary" size="sm">Randevu Verildi</Badge>;
      case 'deneme-yapildi':
        return <Badge variant="success" size="sm">Deneme Yapıldı</Badge>;
      case 'kontrol-hastasi':
        return <Badge variant="secondary" size="sm">Kontrol Hastası</Badge>;
      case 'satis-tamamlandi':
        return <Badge variant="success" size="sm">Satış Tamamlandı</Badge>;
      default:
        return <Badge variant="default" size="sm">{label}</Badge>;
    }
  }, []);

  // Handle card click
  const handleCardClick = useCallback(() => {
    if (onClick) {
      onClick(patient);
    } else if (onSelect) {
      onSelect(patient.id || '');
    }
  }, [onClick, onSelect, patient]);

  // Handle action clicks
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(patient);
  }, [onEdit, patient]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(patient);
  }, [onDelete, patient]);

  const handleCommunication = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCommunication?.(patient);
  }, [onCommunication, patient]);

  // Show loading skeleton if not visible
  if (!isVisible) {
    return (
      <div 
        ref={cardRef}
        className={`bg-white rounded-lg border border-gray-200 p-4 animate-pulse ${className}`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`
        bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200
        hover:shadow-md hover:border-blue-300 cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        ${className}
      `}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          {/* Patient Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </h3>
              {getStatusBadge(patient.status)}
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {patient.phone && (
                <div className="flex items-center">
                  <Phone className="w-3 h-3 mr-1" />
                  <span>{formatPhone(patient.phone)}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center">
                  <Mail className="w-3 h-3 mr-1" />
                  <span className="truncate">{patient.email}</span>
                </div>
              )}
            </div>

            {/* Labels and Tags */}
            <div className="flex items-center space-x-2 mt-2">
              {getLabelBadge(patient.label)}
              {patient.tags && patient.tags.length > 0 && (
                <div className="flex space-x-1">
                  {patient.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {patient.tags.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{patient.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center space-x-1 ml-2">
            {onCommunication && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCommunication}
                className="p-1 h-8 w-8"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="p-1 h-8 w-8"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="p-1 h-8 w-8 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Additional Info for Detailed Variant */}
      {variant === 'detailed' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="space-y-2">
            {(patient.addressFull || patient.address) && (
              <div className="flex items-center text-xs text-gray-500">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="truncate">
                  <span className="truncate">
                    {(() => {
                      const address = patient.address;
                      if (typeof address === 'object' && address !== null) {
                        const addressObj = address as any;
                        return addressObj.fullAddress || 
                               `${addressObj.district || ''} ${addressObj.city || ''}`.trim() ||
                               'Adres bilgisi yok';
                      }
                      return patient.addressFull || address || 'Adres bilgisi yok';
                    })()}
                  </span>
                </span>
              </div>
            )}
            
            {patient.devices && patient.devices.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600 font-medium">
                  {patient.devices.length} cihaz
                </span>
                {patient.lastContactDate && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    Son iletişim: {new Date(patient.lastContactDate).toLocaleDateString('tr-TR')}
                  </div>
                )}
              </div>
            )}

            {patient.notes && patient.notes.length > 0 && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {patient.notes[0].text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

LazyPatientCard.displayName = 'LazyPatientCard';

export default LazyPatientCard;