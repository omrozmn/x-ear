import React from 'react';
import { Button } from '@x-ear/ui-web';
import { Patient } from '../../types/patient';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Edit,
  Trash2,
  Printer,
  Download,
  MessageSquare,
  MoreHorizontal,
  FileText,
  Copy
} from 'lucide-react';

// Badge component
const Badge: React.FC<{
  variant?: 'success' | 'warning' | 'danger' | 'secondary';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}> = ({ variant = 'secondary', size = 'md', children }) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    secondary: 'bg-gray-100 text-gray-800',
  };
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
};

interface PatientHeaderProps {
  patient: Patient;
  onEdit?: () => void;
  onTagUpdate?: () => void;
  onCall?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onSendSMS?: () => void;
  onCopyInfo?: () => void;
  onGenerateReport?: () => void;
  onAddNote?: () => void;
  isLoading?: boolean;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  onEdit,
  onTagUpdate,
  onCall,
  onDelete,
  onPrint,
  onExport,
  onSendSMS,
  onCopyInfo,
  onGenerateReport,
  onAddNote,
  isLoading,
}) => {
  if (isLoading || !patient) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="animate-pulse">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatStatus = (status?: string) => {
    if (!status) return { label: 'Belirtilmemiş', variant: 'secondary' as const };
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' }> = {
      ACTIVE: { label: 'Aktif', variant: 'success' },
      active: { label: 'Aktif', variant: 'success' },
      INACTIVE: { label: 'Pasif', variant: 'secondary' },
      inactive: { label: 'Pasif', variant: 'secondary' },
      PENDING: { label: 'Beklemede', variant: 'warning' },
      pending: { label: 'Beklemede', variant: 'warning' },
      TRIAL: { label: 'Deneme', variant: 'warning' },
      trial: { label: 'Deneme', variant: 'warning' },
      archived: { label: 'Arşivlenmiş', variant: 'danger' },
    };
    return statusMap[status] || { label: status, variant: 'secondary' as const };
  };

  const formatSegment = (segment?: string) => {
    const segmentMap: Record<string, string> = {
      NEW: 'Yeni',
      TRIAL: 'Deneme',
      PURCHASED: 'Satın Almış',
      CONTROL: 'Kontrol',
      RENEWAL: 'Yenileme',
      EXISTING: 'Mevcut',
      VIP: 'VIP'
    };
    return segmentMap[segment || ''] || segment || 'Belirtilmemiş';
  };

  const formatAcquisitionType = (type?: string) => {
    const typeMap: Record<string, string> = {
      referral: 'Referans',
      online: 'Online',
      'walk-in': 'Ziyaret',
      'social-media': 'Sosyal Medya',
      advertisement: 'Reklam',
      tabela: 'Tabela'
    };
    return typeMap[type || ''] || type || 'Belirtilmemiş';
  };

  const formatPriorityScore = (score?: number) => {
    if (!score) return 'Düşük';
    if (score >= 80) return 'Yüksek';
    if (score >= 50) return 'Orta';
    return 'Düşük';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatGender = (g?: string) => {
    if (!g) return 'Belirtilmemiş';
    const v = String(g).toUpperCase();
    if (v === 'F' || v === 'K' || v.includes('KAD') || v.includes('FEMALE')) return 'Kadın';
    if (v === 'M' || v.includes('MALE')) return 'Erkek';
    return g;
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return 'Belirtilmemiş';
    return phone.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '($1) $2 $3 $4');
  };

  const statusInfo = formatStatus(patient.status);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Patient Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {patient.firstName || ''} {patient.lastName || ''}
              </h1>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
              <div>
                <span className="font-medium">Segment:</span> {formatSegment(patient.segment)}
              </div>
              <div>
                <span className="font-medium">Kazanım Türü:</span> {formatAcquisitionType(patient.acquisitionType)}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">{formatPhone(patient.phone)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span title="Hasta ID" className="font-mono text-gray-600 dark:text-gray-400">ID: {patient.id}</span>
              </div>

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">TC: {patient.tcNumber || 'Belirtilmemiş'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">Cinsiyet: {formatGender(patient.gender)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">Doğum: {formatDate(patient.birthDate)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">{patient.email || 'Belirtilmemiş'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {(() => {
                    // İl ve İlçe bilgisi
                    const city = patient.addressCity || (typeof patient.address === 'object' ? (patient.address as any)?.city : '');
                    const district = patient.addressDistrict || (typeof patient.address === 'object' ? (patient.address as any)?.district : '');
                    if (city || district) {
                      return `${district || ''} ${city || ''}`.trim();
                    }
                    return 'Belirtilmemiş';
                  })()}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {(() => {
                    // Tam adres
                    const address = patient.address;
                    if (typeof address === 'object' && address !== null) {
                      const addressObj = address as Record<string, unknown>;
                      return (addressObj.fullAddress as string) || 'Belirtilmemiş';
                    }
                    return patient.addressFull || address || 'Belirtilmemiş';
                  })()}
                </span>
              </div>
            </div>

            {/* Additional Info */}
            {patient.tags && patient.tags.length > 0 && (
              <div className="mt-4 flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                <span>Etiketler:</span>
                {patient.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Primary Actions */}
          {onAddNote && (
            <Button
              size="sm"
              onClick={onAddNote}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
              icon={<MessageSquare className="w-4 h-4" />}
              iconPosition="left"
            >
              Not Ekle
            </Button>
          )}

          {onCall && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCall}
              icon={<Phone className="w-4 h-4" />}
              iconPosition="left"
            >
              Ara
            </Button>
          )}

          {onSendSMS && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendSMS}
              icon={<MessageSquare className="w-4 h-4" />}
              iconPosition="left"
            >
              SMS
            </Button>
          )}

          {onEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={onEdit}
              icon={<Edit className="w-4 h-4" />}
              iconPosition="left"
            >
              Düzenle
            </Button>
          )}

          {onTagUpdate && (
            <Button
              size="sm"
              onClick={onTagUpdate}
              className="bg-green-600 hover:bg-green-700 text-white"
              icon={<Edit className="w-4 h-4" />}
              iconPosition="left"
            >
              Etiket Güncelle
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};