import React from 'react';
import { Button } from '@x-ear/ui-web';
import { RefreshCw, Download } from 'lucide-react';
import { Party } from '../../types/party/party-base.types';

interface SGKStatusCardProps {
  party: Party;
  onQueryStatus: () => void;
  onUpdateInfo: () => void;
  onDownloadReport: () => void;
}

export const SGKStatusCard: React.FC<SGKStatusCardProps> = ({
  party,
  onQueryStatus,
  onUpdateInfo,
  onDownloadReport
}) => {
  // Safe access to party data with fallbacks
  // Safe access to party data with fallbacks (Prioritize HearingProfile)
  const sgkData = party?.hearingProfile?.sgkInfo || party?.sgkInfo || {};
  const sgkStatus = (party?.status as string) || 'pending';

  // Enhanced SGK data with fallbacks (matching legacy implementation)
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return { text: 'Onaylı', class: 'status-badge status-active', color: 'green' };
      case 'pending':
        return { text: 'Beklemede', class: 'status-badge status-pending', color: 'yellow' };
      case 'expired':
        return { text: 'Süresi Dolmuş', class: 'status-badge status-expired', color: 'red' };
      case 'rejected':
        return { text: 'Reddedildi', class: 'status-badge status-rejected', color: 'red' };
      default:
        return { text: 'Bilinmiyor', class: 'status-badge status-pending', color: 'gray' };
    }
  };

  const statusInfo = getStatusInfo(sgkStatus);
  const reportDate = sgkData.reportDate ? new Date(sgkData.reportDate as string).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
  const reportNo = sgkData.reportNo || 'Belirtilmemiş';
  const validityPeriod = sgkData.validityPeriod || 'Belirtilmemiş';
  const contributionAmount = sgkData.contributionAmount || 1500;
  const sgkCoverage = sgkData.sgkCoverage || Math.round((sgkData.coveragePercentage || 0.85) * (contributionAmount as number));
  const totalAmount = (contributionAmount as number) + (sgkCoverage as number);

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">SGK Durum Bilgileri</h3>
        <Button
          onClick={onQueryStatus}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Durumu Sorgula
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SGK Status Information */}
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">SGK Durum Bilgileri</h5>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">SGK Durumu:</span>
              <span className={`px-2 py-1 text-xs rounded ${sgkStatus === 'approved' ? 'bg-green-100 text-green-800' :
                sgkStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  sgkStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                {sgkStatus === 'approved' ? 'Onaylandı' :
                  sgkStatus === 'pending' ? 'Beklemede' :
                    sgkStatus === 'rejected' ? 'Reddedildi' : 'Bilinmiyor'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rapor Tarihi:</span>
              <span className="font-medium">{reportDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rapor No:</span>
              <span className="font-medium">{reportNo as string}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Geçerlilik:</span>
              <span className="font-medium">{validityPeriod as string}</span>
            </div>
            {sgkData.validityDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Geçerlilik Tarihi:</span>
                <span className="font-medium">{new Date(sgkData.validityDate as string).toLocaleDateString('tr-TR')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">SGK No:</span>
              <span className="font-medium">{sgkData.number as string || 'Belirtilmemiş'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kurum:</span>
              <span className="font-medium">{sgkData.institution as string || 'SGK'}</span>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Mali Bilgiler</h5>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Katkı Payı:</span>
              <span className="font-medium">₺{(contributionAmount as number).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SGK Karşılama:</span>
              <span className="font-medium">₺{(sgkCoverage as number).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-medium">Toplam Tutar:</span>
              <span className="font-bold text-lg">₺{(totalAmount as number).toLocaleString()}</span>
            </div>
          </div>

          {/* Device Rights */}
          <div className="mt-4 space-y-2">
            <h6 className="font-medium text-gray-900">Cihaz Hakları</h6>
            <div className="flex justify-between">
              <span className="text-gray-600">Cihaz Hakkı:</span>
              <span className={`px-2 py-1 text-xs rounded ${sgkStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {sgkStatus === 'approved' ? 'Var' : 'Yok'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pil Hakkı:</span>
              <span className={`px-2 py-1 text-xs rounded ${sgkStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {sgkStatus === 'approved' ? 'Var' : 'Yok'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-3">
        <Button onClick={onUpdateInfo} variant="outline">
          SGK Bilgilerini Güncelle
        </Button>
        <Button onClick={onDownloadReport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Rapor İndir
        </Button>
        {sgkStatus === 'pending' && (
          <Button onClick={onQueryStatus} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Durum Sorgula
          </Button>
        )}
      </div>
    </div>
  );
};