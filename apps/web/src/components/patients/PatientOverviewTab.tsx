import React, { useState } from 'react';
import { Patient } from '../../types/patient/patient-base.types';
import { User, Phone, Mail, MapPin, Tag, AlertCircle, CheckCircle, Plus, Edit, MessageSquare, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { PatientNoteForm } from '../forms/PatientNoteForm';
import { Modal } from '@x-ear/ui-web';

interface PatientOverviewTabProps {
  patient: Patient;
  onPatientUpdate?: (patient: Patient) => void;
}

export const PatientOverviewTab: React.FC<PatientOverviewTabProps> = ({
  patient,
  onPatientUpdate,
}) => {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<import('../../types/patient/patient-base.types').PatientLabel | undefined>(patient.labels?.[0]);
  const [labelNotes, setLabelNotes] = useState('');

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
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'inactive':
        return 'Pasif';
      default:
        return 'Bilinmiyor';
    }
  };

  const handleAddNote = () => {
    setShowNoteForm(true);
  };

  const handleUpdateTags = () => {
    setSelectedLabel(patient.labels?.[0]);
    setLabelNotes('');
    setShowTagModal(true);
  };

  const handleSaveLabel = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to update patient label
      console.log('Updating label:', { newLabel: selectedLabel, notes: labelNotes });
      if (onPatientUpdate) {
        onPatientUpdate({ ...patient, labels: selectedLabel ? [selectedLabel] : patient.labels });
      }
      setShowTagModal(false);
    } catch (error) {
      console.error('Label update failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelOptions = [
    { value: 'yeni', label: 'Yeni Hasta' },
    { value: 'arama-yapildi', label: 'Arama Yapıldı' },
    { value: 'randevu-verildi', label: 'Randevu Verildi' },
    { value: 'geldi', label: 'Geldi' },
    { value: 'deneme-yapildi', label: 'Deneme Yapıldı' },
    { value: 'satis-tamamlandi', label: 'Satış Tamamlandı' },
    { value: 'kontrol-hastasi', label: 'Kontrol Hastası' }
  ];

  const handleSendSMS = async () => {
    // TODO: Check SMS package availability from settings
    // For now, show a placeholder alert
    alert('SMS gönderme özelliği ayarlar menüsünden SMS paketi kontrolü yapılacak şekilde geliştirilecek.');
  };

  const handleNoteSave = async (noteData: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement note saving logic
      console.log('Saving note:', noteData);
      setShowNoteForm(false);
    } catch (error) {
      console.error('Note save failed:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Buttons */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Hızlı İşlemler</h3>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAddNote}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Not Ekle
            </Button>
            <Button
              onClick={handleUpdateTags}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
            >
              <Edit className="w-4 h-4 mr-2" />
              Etiket Güncelle
            </Button>
            <Button
              onClick={handleSendSMS}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS Gönder
            </Button>
          </div>
        </div>
      </div>

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
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Adres Bilgileri</h3>
        </div>
        <div className="p-6">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Adres</p>
              <p className="text-sm text-gray-900">
                {(() => {
                  if (!patient.addressFull) {
                    return 'Adres bilgisi bulunmuyor';
                  }
                  
                  return patient.addressFull;
                })()}
              </p>
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
      {showNoteForm && (
        <PatientNoteForm
          patientId={patient.id || ''}
          isOpen={showNoteForm}
          onClose={() => setShowNoteForm(false)}
          onSave={handleNoteSave}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};