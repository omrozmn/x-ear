import React, { useState } from 'react';
import { Button, Input } from '@x-ear/ui-web';
import { Search, FileText, Download, Eye, RefreshCw } from 'lucide-react';

interface PatientSGKTabProps {
  patient: Patient;
  onPatientUpdate?: (patient: Patient) => void;
}

export const PatientSGKTab: React.FC<PatientSGKTabProps> = ({ patient, onPatientUpdate: _onPatientUpdate }) => {
  const [eReceiptNo, setEReceiptNo] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [isQueryingReport, setIsQueryingReport] = useState(false);

  const sgkData = patient.sgkInfo || {};
  const sgkStatus = sgkData.status || patient.sgkStatus || 'pending';
  const reportDate = sgkData.reportDate || sgkData.lastReportDate || '05 Ocak 2024';
  const reportNo = sgkData.reportNo || `SGK-2024-${patient.id?.slice(-6) || '001234'}`;
  const validityPeriod = sgkData.validityPeriod || '2 Yıl';
  const contributionAmount = sgkData.contributionAmount || 1500;
  const sgkCoverage = sgkData.sgkCoverage || 8500;
  const totalAmount = contributionAmount + sgkCoverage;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return { text: 'Onaylı', class: 'px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full' };
      case 'pending':
        return { text: 'Beklemede', class: 'px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full' };
      case 'expired':
        return { text: 'Süresi Dolmuş', class: 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full' };
      case 'rejected':
        return { text: 'Reddedildi', class: 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full' };
      default:
        return { text: 'Bilinmiyor', class: 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full' };
    }
  };

  const statusInfo = getStatusInfo(sgkStatus);

  const handleEReceiptQuery = async () => {
    if (!eReceiptNo.trim()) return;

    setIsQuerying(true);
    try {
      // TODO: Implement e-receipt query API call
      console.log('Querying e-receipt:', eReceiptNo);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error querying e-receipt:', error);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleReportQuery = async () => {
    setIsQueryingReport(true);
    try {
      // TODO: Implement report query API call
      console.log('Querying patient report for TC:', patient.tcNumber);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error querying report:', error);
    } finally {
      setIsQueryingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SGK Status Information */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">SGK Durum Bilgileri</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SGK Status Information */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">SGK Durumu:</span>
                  <span className={statusInfo.class}>{statusInfo.text}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rapor Tarihi:</span>
                  <span className="font-medium">{reportDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rapor No:</span>
                  <span className="font-medium">{reportNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Geçerlilik:</span>
                  <span className="font-medium">{validityPeriod}</span>
                </div>
                {sgkData.validityDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Geçerlilik Tarihi:</span>
                    <span className="font-medium">{new Date(sgkData.validityDate).toLocaleDateString('tr-TR')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Katkı Payı:</span>
                  <span className="font-medium">₺{contributionAmount.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SGK Karşılama:</span>
                  <span className="font-medium">₺{sgkCoverage.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600 font-medium">Toplam Tutar:</span>
                  <span className="font-bold text-lg">₺{totalAmount.toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* E-receipt Query Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">E-Reçete Sorgulama</h3>
        </div>
        <div className="p-6">
          <div className="flex space-x-4 mb-4">
            <Input
              type="text"
              placeholder="E-reçete numarası giriniz"
              value={eReceiptNo}
              onChange={(e) => setEReceiptNo(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleEReceiptQuery}
              disabled={isQuerying || !eReceiptNo.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isQuerying ? 'Sorgulanıyor...' : 'Sorgula'}
            </Button>
          </div>
          <div id="eReceiptResult" className="hidden">
            {/* E-receipt query results will be displayed here */}
          </div>
        </div>
      </div>

      {/* Report Query Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Rapor Sorgulama</h3>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">Hasta TC Kimlik Numarası ile rapor haklarını sorgulayın</p>
            <Button
              onClick={handleReportQuery}
              disabled={isQueryingReport}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isQueryingReport ? 'Sorgulanıyor...' : 'Rapor Sorgula'}
            </Button>
          </div>
          <div id="reportResult" className="hidden">
            {/* Report query results will be displayed here */}
          </div>
        </div>
      </div>

      {/* Saved E-receipts Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Kaydedilmiş E-Reçeteler{' '}
            <span className="text-sm font-normal text-gray-500">
              ({patient.eReceipts?.length || 0} kaydedilmiş e-reçete)
            </span>
          </h3>
        </div>
        <div className="p-6">
          {patient.eReceipts && patient.eReceipts.length > 0 ? (
            <div className="space-y-4">
              {patient.eReceipts.map((receipt, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">E-Reçete #{receipt.number}</p>
                      <p className="text-sm text-gray-500">{receipt.date}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      Görüntüle
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      İndir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Henüz kaydedilmiş e-reçete bulunmamaktadır.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};