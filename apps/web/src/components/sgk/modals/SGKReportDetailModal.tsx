import React from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import type { Party } from '../../../types/party/party-base.types';

interface SGKReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  reportId?: string;
  title?: string;
}

// Mock SGK rapor detayları
interface SGKReportDetail {
  id: string;
  partyId: string;
  reportType: string;
  reportDate: string;
  doctorName: string;
  hospitalName: string;
  diagnosis: string;
  recommendations: string;
  status: 'pending' | 'approved' | 'rejected';
  sgkNumber: string;
  validUntil: string;
  notes?: string;
}

const mockReportDetail: SGKReportDetail = {
  id: 'sgk_report_001',
  partyId: 'pat_001',
  reportType: 'İşitme Cihazı Raporu',
  reportDate: '2024-01-15',
  doctorName: 'Dr. Ahmet Özkan',
  hospitalName: 'İstanbul Üniversitesi Hastanesi',
  diagnosis: 'Bilateral sensörinöral işitme kaybı',
  recommendations: 'Çift taraflı işitme cihazı kullanımı önerilir',
  status: 'approved',
  sgkNumber: 'SGK2024001234',
  validUntil: '2025-01-15',
  notes: 'Hasta düzenli kontrollere gelmelidir'
};

export const SGKReportDetailModal: React.FC<SGKReportDetailModalProps> = ({
  isOpen,
  onClose,
  party,
  reportId,
  title = 'SGK Rapor Detayları'
}) => {
  const handlePrint = () => {
    // Rapor yazdırma işlemi
    console.log('Rapor yazdırılıyor:', reportId);
    // Gerçek uygulamada PDF oluşturma veya yazdırma işlemi yapılacak
  };

  const handleDownload = () => {
    // Rapor indirme işlemi
    console.log('Rapor indiriliyor:', reportId);
    // Gerçek uygulamada PDF indirme işlemi yapılacak
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* Hasta Bilgileri */}
        {party && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Hasta Bilgileri</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Ad Soyad:</span>
                <span className="ml-2 font-medium">{party.firstName} {party.lastName}</span>
              </div>
              <div>
                <span className="text-gray-500">TC Kimlik No:</span>
                <span className="ml-2 font-medium">{party.tcNumber}</span>
              </div>
            </div>
          </div>
        )}

        {/* Rapor Detayları */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Rapor Bilgileri</h4>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(mockReportDetail.status)}`}>
              {getStatusText(mockReportDetail.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Rapor Türü</label>
                <p className="text-gray-900">{mockReportDetail.reportType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Rapor Tarihi</label>
                <p className="text-gray-900">{new Date(mockReportDetail.reportDate).toLocaleDateString('tr-TR')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Doktor Adı</label>
                <p className="text-gray-900">{mockReportDetail.doctorName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Hastane</label>
                <p className="text-gray-900">{mockReportDetail.hospitalName}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">SGK Numarası</label>
                <p className="text-gray-900">{mockReportDetail.sgkNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Geçerlilik Tarihi</label>
                <p className="text-gray-900">{new Date(mockReportDetail.validUntil).toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Tanı</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{mockReportDetail.diagnosis}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Öneriler</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{mockReportDetail.recommendations}</p>
          </div>

          {mockReportDetail.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Notlar</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{mockReportDetail.notes}</p>
            </div>
          )}
        </div>

        {/* Modal Aksiyonları */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handlePrint}
            >
              Yazdır
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
            >
              İndir
            </Button>
          </div>
          <Button
            variant="primary"
            onClick={onClose}
          >
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
};