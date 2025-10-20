import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Button, Modal } from '@x-ear/ui-web';
import { usePatient } from '../../hooks/patient/usePatient';
import { PatientTabs, PatientTab } from './PatientTabs';
import { PatientTabContent } from './PatientTabContent';
import { PatientForm } from './PatientForm';
import { PatientHeader } from './PatientHeader';
import { Patient } from '../../types/patient';
import { ArrowLeft, Edit, Tag, MessageSquare } from 'lucide-react';

export const PatientDetailsPage: React.FC = () => {
  const { patientId } = useParams({ strict: false }) as { patientId: string };
  const navigate = useNavigate();
  const { patient, loadPatient, updatePatient, loading, error } = usePatient(patientId);

  const [activeTab, setActiveTab] = useState<PatientTab>('general');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadPatient(patientId);
    }
  }, [patientId, loadPatient]);

  const handleSavePatient = async (patientData: Patient) => {
    try {
      if (!patientId) return;
      await updatePatient(patientData);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const handleUpdateLabel = async (labelData: { acquisitionType?: string; label?: Patient['label'] }) => {
    if (!patient) return;

    try {
      const updatedData = {
        ...patient,
        ...labelData
      } as Patient;
      await updatePatient(updatedData);
      setShowLabelModal(false);
    } catch (error) {
      console.error('Error updating patient label:', error);
    }
  };

  const handlePatientUpdate = async (updatedPatient: Patient) => {
    try {
      await updatePatient(updatedPatient);
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const handleAddNote = () => {
    // Switch to notes tab and trigger add note modal
    setActiveTab('notes');
    // The PatientTabContent component will handle the modal
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Hasta bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Hasta Bulunamadı</h3>
            <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : error || 'Bilinmeyen hata'}</p>
            <Button onClick={() => navigate({ to: '/patients' })}>
              Hasta Listesine Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: '/patients' })}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Geri
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {patient.firstName} {patient.lastName}
                </h1>
                <p className="text-sm text-gray-500">
                  Hasta Detayları
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddNote}
                icon={<MessageSquare className="w-4 h-4" />}
              >
                Not Ekle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLabelModal(true)}
                icon={<Tag className="w-4 h-4" />}
              >
                Etiket Güncelle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                icon={<Edit className="w-4 h-4" />}
              >
                Düzenle
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patient Header Card */}
        <div className="mb-8">
          <PatientHeader patient={patient} />
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <PatientTabs
            patient={patient}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        <PatientTabContent
          patient={patient}
          activeTab={activeTab}
          onPatientUpdate={handlePatientUpdate}
        />
      </div>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Hasta Bilgilerini Düzenle"
        size="lg"
      >
        <PatientForm
          patient={patient}
          onSave={handleSavePatient}
          onCancel={() => setShowEditModal(false)}
          isModal={true}
        />
      </Modal>

      {/* Update Label Modal */}
      <Modal
        isOpen={showLabelModal}
        onClose={() => setShowLabelModal(false)}
        title="Hasta Etiketlerini Güncelle"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Edinilme Türü
            </label>
            <select data-allow-raw="true"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue={patient.acquisitionType || ''}
            >
              <option value="">Seçiniz</option>
              <option value="tabela">Tabela</option>
              <option value="sosyal_medya">Sosyal Medya</option>
              <option value="tanitim">Tanıtım</option>
              <option value="referans">Referans</option>
              <option value="walk_in">Direkt Başvuru</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dönüşüm Adımı
            </label>
            <select data-allow-raw="true"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue={patient.label || ''}
            >
              <option value="">Seçiniz</option>
              <option value="yeni">Yeni Hasta</option>
              <option value="arama-bekliyor">Arama Bekliyor</option>
              <option value="randevu-verildi">Randevu Verildi</option>
              <option value="deneme-yapildi">Deneme Yapıldı</option>
              <option value="kontrol-hastasi">Kontrol Hastası</option>
              <option value="satis-tamamlandi">Satış Tamamlandı</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowLabelModal(false)}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                  const acquisitionTypeRaw = (document.querySelector('select:first-of-type') as HTMLSelectElement)?.value;
                  const labelRaw = (document.querySelector('select:last-of-type') as HTMLSelectElement)?.value;
                  const allowedAcq: Patient['acquisitionType'][] = ['tabela','sosyal-medya','tanitim','referans','diger'];
                  const allowedLabels: Patient['label'][] = ['yeni','arama-bekliyor','randevu-verildi','deneme-yapildi','kontrol-hastasi','satis-tamamlandi'];
                  const acq = allowedAcq.includes(acquisitionTypeRaw as any) ? acquisitionTypeRaw as Patient['acquisitionType'] : undefined;
                  const label = allowedLabels.includes(labelRaw as any) ? labelRaw as Patient['label'] : undefined;
                  handleUpdateLabel({ acquisitionType: acq, label });
                }}
            >
              Etiketleri Güncelle
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};