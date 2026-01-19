import React from 'react';
import { Button } from '@x-ear/ui-web';
import { FileText, RefreshCw } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface PartyReport {
  type: string;
  date: string;
  validUntil: string;
  status: string;
  renewalDate: string;
  doctor: string;
}

interface PartyReportsSectionProps {
  partyReports: PartyReport[];
  reportsLoading: boolean;
  onQueryPartyReport: () => void;
}

export const PartyReportsSection: React.FC<PartyReportsSectionProps> = ({
  partyReports,
  reportsLoading,
  onQueryPartyReport
}) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Hasta Raporları</h3>
        <Button
          onClick={onQueryPartyReport}
          disabled={reportsLoading}
        >
          {reportsLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Rapor Sorgula
        </Button>
      </div>

      {partyReports.length > 0 ? (
        <div className="space-y-3">
          {partyReports.map((report, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 mb-2">{report.type}</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div><strong>Rapor Tarihi:</strong> {new Date(report.date).toLocaleDateString('tr-TR')}</div>
                    <div><strong>Geçerlilik:</strong> {new Date(report.validUntil).toLocaleDateString('tr-TR')}</div>
                    <div><strong>Yenileme Tarihi:</strong> {new Date(report.renewalDate).toLocaleDateString('tr-TR')}</div>
                    <div><strong>Doktor:</strong> {report.doctor}</div>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={report.status === 'Geçerli' ? 'approved' : report.status === 'Yakında Dolacak' ? 'pending' : 'rejected'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Henüz hasta raporu bulunmuyor.</p>
        </div>
      )}
    </div>
  );
};