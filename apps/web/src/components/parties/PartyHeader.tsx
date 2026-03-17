import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@x-ear/ui-web';
import { Party } from '../../types/party';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Edit,
  MessageSquare,
  FileText,
  Trash2,
  AlertTriangle
} from 'lucide-react';

// Badge component
const Badge: React.FC<{
  variant?: 'success' | 'warning' | 'danger' | 'secondary';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}> = ({ variant = 'secondary', size = 'md', children }) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  const variantClasses = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-yellow-800',
    danger: 'bg-destructive/10 text-red-800',
    secondary: 'bg-muted text-foreground',
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

interface PartyHeaderProps {
  party: Party;
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

export const PartyHeader: React.FC<PartyHeaderProps> = ({
  party,
  onEdit,
  onTagUpdate,
  onCall,
  onDelete,
  // onPrint, // Currently unused
  // onExport, // Currently unused
  onSendSMS,
  // onCopyInfo, // Currently unused
  // onGenerateReport, // Currently unused
  onAddNote,
  isLoading,
}) => {
  const { t } = useTranslation(['parties_extra', 'patients', 'common']);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    onDelete?.();
  };

  if (isLoading || !party) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-border p-6 mb-6">
        <div className="animate-pulse">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-accent rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-accent rounded w-48"></div>
              <div className="h-4 bg-accent rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // formatStatus function removed - not used in render
  // const statusInfo = formatStatus(party.status || undefined);

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

  /*
  const formatPriorityScore = (score?: number) => {
    if (!score) return 'Düşük';
    if (score >= 80) return 'Yüksek';
    if (score >= 50) return 'Orta';
    return 'Düşük';
  };
  */

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

  // const statusInfo = formatStatus(party.status || undefined); // Not used in render

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-border p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>

          {/* Party Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {party.firstName || ''} {party.lastName || ''}
              </h1>
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
              <div>
                <span className="font-medium">Segment:</span> {formatSegment(party.segment || undefined)}
              </div>
              <div>
                <span className="font-medium">Kazanım Türü:</span> {formatAcquisitionType(party.acquisitionType || undefined)}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{formatPhone(party.phone || undefined)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span title="Hasta ID" className="font-mono text-muted-foreground">ID: {party.id}</span>
              </div>

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">TC: {party.tcNumber || 'Belirtilmemiş'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">Cinsiyet: {formatGender(party.gender || undefined)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">Doğum: {formatDate(party.birthDate || undefined)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{party.email || 'Belirtilmemiş'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {(() => {
                    // Handle address as object or string
                    const address = party.address || party.addressFull || party.address_full;
                    if (typeof address === 'string') {
                      return address;
                    } else if (typeof address === 'object' && address !== null) {
                      // Handle address object with city, district, fullAddress
                      const addressObj = address as { fullAddress?: string; district?: string; city?: string; full_address?: string };
                      return addressObj.fullAddress || addressObj.full_address ||
                        `${addressObj.district || ''} ${addressObj.city || ''}`.trim() ||
                        'Adres bilgisi yok';
                    }
                    return 'Adres bilgisi yok';
                  })()}
                </span>
              </div>
            </div>

            {/* Additional Info */}
            {party.tags && party.tags.length > 0 && (
              <div className="mt-4 flex items-center space-x-1 text-sm text-muted-foreground">
                <span>Etiketler:</span>
                {party.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Primary Action - Not Ekle */}
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

          {/* Secondary Actions Group */}
          <div className="flex items-center gap-2 px-2 border-l border-border">
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
                variant="outline"
                size="sm"
                onClick={onTagUpdate}
                icon={<FileText className="w-4 h-4" />}
                iconPosition="left"
              >
                Etiket Güncelle
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
          </div>

          {/* Danger Zone */}
          {onDelete && (
            <div className="flex items-center gap-2 px-2 border-l border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteClick}
                data-testid="party-delete-button"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-red-300 dark:border-red-700 dark:hover:bg-red-900/20"
                icon={<Trash2 className="w-4 h-4" />}
                iconPosition="left"
              >
                Sil
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Hastayı Sil"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-destructive/10 rounded-2xl border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Bu işlem geri alınamaz!
              </p>
              <p className="text-sm text-destructive mt-1">
                <span className="font-semibold">{party.firstName} {party.lastName}</span> isimli hastayı ve tüm ilişkili verilerini silmek üzeresiniz.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
            >
              İptal
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
              icon={<Trash2 className="w-4 h-4" />}
              iconPosition="left"
            >
              Evet, Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};