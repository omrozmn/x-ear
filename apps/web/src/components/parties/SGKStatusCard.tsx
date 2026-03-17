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
  // getStatusInfo function removed - not used
  const reportDate = sgkData.reportDate ? new Date(sgkData.reportDate as string).toLocaleDateString('tr-TR') : 'Belirtilmemiş';
  const reportNo = sgkData.reportNo || 'Belirtilmemiş';
  const validityPeriod = sgkData.validityPeriod || 'Belirtilmemiş';
  const contributionAmount = sgkData.contributionAmount || 1500;
  const sgkCoverage = sgkData.sgkCoverage || Math.round((sgkData.coveragePercentage || 0.85) * (contributionAmount as number));
  const totalAmount = (contributionAmount as number) + (sgkCoverage as number);

  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">SGK Durum Bilgileri</h3>
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
          <h5 className="font-medium text-foreground">SGK Durum Bilgileri</h5>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SGK Durumu:</span>
              <span className={`px-2 py-1 text-xs rounded ${sgkStatus === 'approved' ? 'bg-success/10 text-success' :
                sgkStatus === 'pending' ? 'bg-warning/10 text-yellow-800' :
                  sgkStatus === 'rejected' ? 'bg-destructive/10 text-red-800' :
                    'bg-muted text-foreground'
                }`}>
                {sgkStatus === 'approved' ? 'Onaylandı' :
                  sgkStatus === 'pending' ? 'Beklemede' :
                    sgkStatus === 'rejected' ? 'Reddedildi' : 'Bilinmiyor'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rapor Tarihi:</span>
              <span className="font-medium">{reportDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rapor No:</span>
              <span className="font-medium">{reportNo as string}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Geçerlilik:</span>
              <span className="font-medium">{validityPeriod as string}</span>
            </div>
            {sgkData.validityDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Geçerlilik Tarihi:</span>
                <span className="font-medium">{new Date(sgkData.validityDate as string).toLocaleDateString('tr-TR')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">SGK No:</span>
              <span className="font-medium">{sgkData.number as string || 'Belirtilmemiş'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kurum:</span>
              <span className="font-medium">{sgkData.institution as string || 'SGK'}</span>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="space-y-4">
          <h5 className="font-medium text-foreground">Mali Bilgiler</h5>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Katkı Payı:</span>
              <span className="font-medium">₺{(contributionAmount as number).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SGK Karşılama:</span>
              <span className="font-medium">₺{(sgkCoverage as number).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground font-medium">Toplam Tutar:</span>
              <span className="font-bold text-lg">₺{(totalAmount as number).toLocaleString()}</span>
            </div>
          </div>

          {/* Device Rights */}
          <div className="mt-4 space-y-2">
            <h6 className="font-medium text-foreground">Cihaz Hakları</h6>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cihaz Hakkı:</span>
              <span className={`px-2 py-1 text-xs rounded ${sgkStatus === 'approved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-red-800'}`}>
                {sgkStatus === 'approved' ? 'Var' : 'Yok'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pil Hakkı:</span>
              <span className={`px-2 py-1 text-xs rounded ${sgkStatus === 'approved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-red-800'}`}>
                {sgkStatus === 'approved' ? 'Var' : 'Yok'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-3">
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