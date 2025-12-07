import React, { useState } from 'react';
import { Patient } from '../../types/patient/patient-base.types';
import { User, Phone, Mail, MapPin, Tag, AlertCircle, CheckCircle, Plus, Edit, MessageSquare, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal, Input, Textarea } from '@x-ear/ui-web';

interface PatientOverviewTabProps {
  patient: Patient;
  onPatientUpdate?: (patient: Patient) => void;
  showNoteModal?: boolean;
  onCloseNoteModal?: () => void;
}

export const PatientOverviewTab: React.FC<PatientOverviewTabProps> = ({
  patient,
  onPatientUpdate,
  showNoteModal = false,
  onCloseNoteModal,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Use external control for modal state
  const isModalOpen = showNoteModal;

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Hasta Bulunamadı</h3>
        <p className="text-gray-500">Hasta bilgileri yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status?: string) => {
    const statusMap: Record<string, string> = {
      ACTIVE: 'Aktif',
      active: 'Aktif',
      INACTIVE: 'Pasif',
      inactive: 'Pasif',
      TRIAL: 'Deneme',
      trial: 'Deneme',
      archived: 'Arşivlenmiş'
    };
    return statusMap[status || ''] || 'Bilinmiyor';
  };

  const getSegmentText = (segment?: string) => {
    const segmentMap: Record<string, string> = {
      NEW: 'Yeni',
      TRIAL: 'Deneme',
      PURCHASED: 'Satın Almış',
      CONTROL: 'Kontrol',
      RENEWAL: 'Yenileme',
      EXISTING: 'Mevcut',
      VIP: 'VIP'
    };
    return segmentMap[segment || ''] || 'Belirtilmemiş';
  };

  const getAcquisitionTypeText = (type?: string) => {
    const typeMap: Record<string, string> = {
      referral: 'Referans',
      online: 'Online',
      'walk-in': 'Ziyaret',
      'social-media': 'Sosyal Medya',
      advertisement: 'Reklam',
      tabela: 'Tabela'
    };
    return typeMap[type || ''] || 'Belirtilmemiş';
  };



  const handleNoteSave = async () => {
    if (!noteContent.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      // TODO: Implement note saving logic
      console.log('Saving note:', { 
        patientId: patient.id,
        title: noteTitle || 'Not',
        content: noteContent 
      });
      
      // Close modal and reset form
      if (onCloseNoteModal) {
        onCloseNoteModal();
      }
      setNoteTitle('');
      setNoteContent('');
    } catch (error) {
      console.error('Note save failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (onCloseNoteModal) {
      onCloseNoteModal();
    }
    setNoteTitle('');
    setNoteContent('');
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Kişisel Bilgiler</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Ad Soyad</p>
                <p className="text-sm text-gray-900">{patient.firstName} {patient.lastName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Telefon</p>
                <p className="text-sm text-gray-900">{patient.phone || 'Belirtilmemiş'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">E-posta</p>
                <p className="text-sm text-gray-900">{patient.email || 'Belirtilmemiş'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 flex items-center justify-center">
                {getStatusBadge(patient.status)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Durum</p>
                <p className="text-sm text-gray-900">{getStatusText(patient.status)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Tag className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">TC Kimlik No</p>
                <p className="text-sm text-gray-900">{patient.tcNumber || 'Belirtilmemiş'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Doğum Tarihi</p>
                <p className="text-sm text-gray-900">
                  {patient.birthDate ? formatDate(patient.birthDate) : 'Belirtilmemiş'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Tag className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Segment</p>
                <p className="text-sm text-gray-900">{getSegmentText(patient.segment)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Tag className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Kazanım Türü</p>
                <p className="text-sm text-gray-900">{getAcquisitionTypeText(patient.acquisitionType)}</p>
              </div>
            </div>

            {(patient as any).branchId && (patient as any).branchId !== 'branch-1' && (
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Şube</p>
                  <p className="text-sm text-gray-900">{(patient as any).branchId}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Adres Bilgileri</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">İl</p>
                <p className="text-sm text-gray-900">
                  {patient.addressCity || 'Belirtilmemiş'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">İlçe</p>
                <p className="text-sm text-gray-900">
                  {patient.addressDistrict || 'Belirtilmemiş'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 md:col-span-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-1">Adres</p>
                <p className="text-sm text-gray-900">
                  {patient.addressFull || 'Adres bilgisi bulunmuyor'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Ek Bilgiler</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {patient.notes && patient.notes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Son Notlar</p>
                <div className="space-y-2">
                  {patient.notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-900">{note.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {note.author} - {formatDate(note.date)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {patient.tags && patient.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Etiketler</p>
                <div className="flex flex-wrap gap-2">
                  {patient.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-gray-500">Kayıt Tarihi</p>
                <p className="text-sm text-gray-900">
                  {patient.createdAt ? formatDate(patient.createdAt) : 'Bilinmiyor'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Son Güncelleme</p>
                <p className="text-sm text-gray-900">
                  {patient.updatedAt ? formatDate(patient.updatedAt) : 'Bilinmiyor'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Not Ekle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık (Opsiyonel)
            </label>
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Not başlığı"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Not <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Notunuzu buraya yazın..."
              rows={5}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              onClick={handleNoteSave}
              disabled={!noteContent.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};