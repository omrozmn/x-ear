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
  onCall?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onSendSMS?: () => void;
  onCopyInfo?: () => void;
  onGenerateReport?: () => void;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  onEdit,
  onCall,
  onDelete,
  onPrint,
  onExport,
  onSendSMS,
  onCopyInfo,
  onGenerateReport,
}) => {
  const formatStatus = (status?: string) => {
    if (!status) return { label: 'Belirtilmemiş', variant: 'secondary' as const };
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' }> = {
      active: { label: 'Aktif', variant: 'success' },
      inactive: { label: 'Pasif', variant: 'secondary' },
      pending: { label: 'Beklemede', variant: 'warning' },
      archived: { label: 'Arşivlenmiş', variant: 'danger' },
    };
    return statusMap[status] || { label: status, variant: 'secondary' as const };
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

  const formatPhone = (phone?: string) => {
    if (!phone) return 'Belirtilmemiş';
    return phone.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '($1) $2 $3 $4');
  };

  const statusInfo = formatStatus(patient.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>

          {/* Patient Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.firstName || ''} {patient.lastName || ''}
              </h1>
              <Badge variant={statusInfo.variant}>
                {statusInfo.label}
              </Badge>
              <span className="text-sm text-gray-500">
                Öncelik: {formatPriorityScore(patient.priorityScore)}
              </span>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              <span className="font-medium">Segment:</span> {patient.segment || 'Belirtilmemiş'}
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{formatPhone(patient.phone)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>TC: {patient.tcNumber || 'Belirtilmemiş'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Doğum: {formatDate(patient.birthDate)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{patient.email || 'Belirtilmemiş'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>
                  {(() => {
                    const address = patient.address;
                    if (typeof address === 'object' && address !== null) {
                      const addressObj = address as Record<string, unknown>;
                      return (addressObj.fullAddress as string) || 
                             `${addressObj.district || ''} ${addressObj.city || ''}`.trim() ||
                             'Belirtilmemiş';
                    }
                    return patient.addressFull || address || 'Belirtilmemiş';
                  })()}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Kazanım: {patient.acquisitionType || 'Belirtilmemiş'}</span>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span>Kayıt: {formatDate(patient.createdAt)}</span>
              {patient.tags && patient.tags.length > 0 && (
                <div className="flex items-center space-x-1">
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
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Primary Actions */}
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

          {/* Secondary Actions Dropdown */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              icon={<MoreHorizontal className="w-4 h-4" />}
            >
              Diğer
            </Button>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                {onPrint && (
                  <Button
                    variant="ghost"
                    onClick={onPrint}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 justify-start"
                  >
                    <Printer className="w-4 h-4 mr-3" />
                    Yazdır
                  </Button>
                )}
                
                {onExport && (
                  <Button
                    variant="ghost"
                    onClick={onExport}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 justify-start"
                  >
                    <Download className="w-4 h-4 mr-3" />
                    Dışa Aktar
                  </Button>
                )}
                
                {onGenerateReport && (
                  <Button
                    variant="ghost"
                    onClick={onGenerateReport}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 justify-start"
                  >
                    <FileText className="w-4 h-4 mr-3" />
                    Rapor Oluştur
                  </Button>
                )}
                
                {onCopyInfo && (
                  <Button
                    variant="ghost"
                    onClick={onCopyInfo}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 justify-start"
                  >
                    <Copy className="w-4 h-4 mr-3" />
                    Bilgileri Kopyala
                  </Button>
                )}
                
                {onDelete && (
                  <>
                    <div className="border-t border-gray-100 my-1"></div>
                    <Button
                      variant="ghost"
                      onClick={onDelete}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 justify-start"
                    >
                      <Trash2 className="w-4 h-4 mr-3" />
                      Sil
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}