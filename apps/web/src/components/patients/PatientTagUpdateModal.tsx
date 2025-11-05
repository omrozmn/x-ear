import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { PenSquare, Settings } from 'lucide-react';
import type { Patient, PatientStatus, PatientSegment } from '../../types/patient/patient-base.types';

interface PatientTagUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onUpdate: (patientId: string, updates: {
    status?: PatientStatus;
    segment?: PatientSegment;
    acquisitionType?: string;
    branchId?: string;
  }) => Promise<void>;
}

export function PatientTagUpdateModal({
  isOpen,
  onClose,
  patient,
  onUpdate
}: PatientTagUpdateModalProps) {
  const [status, setStatus] = useState<PatientStatus>('ACTIVE');
  const [segment, setSegment] = useState<PatientSegment>('NEW');
  const [acquisitionType, setAcquisitionType] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (patient) {
      setStatus((patient.status as PatientStatus) || 'ACTIVE');
      setSegment((patient.segment as PatientSegment) || 'NEW');
      setAcquisitionType(patient.acquisitionType || '');
      setBranchId(patient.branchId || '');
    }
  }, [patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.id) return;

    setIsSubmitting(true);
    try {
      await onUpdate(patient.id, {
        status,
        segment,
        acquisitionType,
        branchId
      });
      onClose();
    } catch (error) {
      console.error('Failed to update patient tags:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!patient) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Etiket Güncelle"
      size="md"
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            <strong>{patient.firstName} {patient.lastName}</strong> için etiketleri güncelleyin
          </p>
          {/* TODO: Ayarlar sayfası henüz yapılmadı - bu butonu aktif hale getir */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              // TODO: Navigate to /settings/patients when settings page is ready
              alert('Ayarlar sayfası henüz hazırlanmadı. Hasta etiket ayarlarına yönlendirilecek.');
            }}
            icon={<Settings className="w-4 h-4" />}
            iconPosition="left"
            className="text-xs"
          >
            Etiketleri Düzenle
          </Button>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Durum
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PatientStatus)}
            className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
            <option value="TRIAL">Deneme</option>
            <option value="BLOCKED">Engelli</option>
          </select>
        </div>

        <div>
          <label htmlFor="segment" className="block text-sm font-medium text-gray-700 mb-1">
            Segment
          </label>
          <select
            id="segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value as PatientSegment)}
            className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="NEW">Yeni</option>
            <option value="LEAD">Potansiyel</option>
            <option value="TRIAL">Deneme</option>
            <option value="PURCHASED">Satın Alındı</option>
            <option value="CONTROL">Kontrol</option>
            <option value="RENEWAL">Yenileme</option>
            <option value="EXISTING">Mevcut</option>
            <option value="VIP">VIP</option>
          </select>
        </div>

        <div>
          <label htmlFor="acquisitionType" className="block text-sm font-medium text-gray-700 mb-1">
            Kazanım Türü
          </label>
          <select
            id="acquisitionType"
            value={acquisitionType}
            onChange={(e) => setAcquisitionType(e.target.value)}
            className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Seçiniz</option>
            <option value="referral">Referans</option>
            <option value="online">Online</option>
            <option value="walk-in">Ziyaret</option>
            <option value="social-media">Sosyal Medya</option>
            <option value="advertisement">Reklam</option>
            <option value="tabela">Tabela</option>
            <option value="other">Diğer</option>
          </select>
        </div>

        <div>
          <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-1">
            Şube
          </label>
          <select
            id="branchId"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Seçiniz</option>
            <option value="branch-1">Merkez Şube</option>
            <option value="branch-2">Kadıköy Şube</option>
            <option value="branch-3">Beşiktaş Şube</option>
          </select>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} icon={<PenSquare className="w-4 h-4" />} iconPosition="left">
            Güncelle
          </Button>
        </div>
      </form>
    </Modal>
  );
}
