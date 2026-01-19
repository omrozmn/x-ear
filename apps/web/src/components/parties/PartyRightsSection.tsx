import React, { useState } from 'react';
import { Button, Badge } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import { Shield, Loader2 } from 'lucide-react';
import { Party } from '../../types/party/party-base.types';

interface PartyRightsSectionProps {
  party: Party;
  partyId: string;
}

// Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
  );
};

export const PartyRightsSection: React.FC<PartyRightsSectionProps> = ({ party, partyId }) => {
  const { success: showSuccess, error: showError } = useToastHelpers();

  const [partyRightsData, setPartyRightsData] = useState<any>(null);
  const [isQueryingRights, setIsQueryingRights] = useState(false);

  const handleReportQuery = async () => {
    setIsQueryingRights(true);

    try {
      const mockRightsData = {
        partyId: partyId,
        partyName: party.firstName + ' ' + party.lastName,
        sgkNo: (party.hearingProfile?.sgkInfo as any)?.sgkNumber || party.sgkInfo?.sgkNumber || '12345678901',
        coverage: {
          hearingAid: {
            percentage: 85,
            maxAmount: 2500,
            usedAmount: 1200,
            remainingAmount: 1300,
            lastUpdate: '15.01.2024'
          },
          accessories: {
            percentage: 90,
            maxAmount: 500,
            usedAmount: 180,
            remainingAmount: 320,
            lastUpdate: '15.01.2024'
          },
          maintenance: {
            percentage: 100,
            maxAmount: 300,
            usedAmount: 0,
            remainingAmount: 300,
            lastUpdate: '15.01.2024'
          }
        },
        validityPeriod: {
          startDate: '01.01.2024',
          endDate: '31.12.2024',
          remainingDays: 180
        },
        recentActivity: [
          {
            date: '15.01.2024',
            type: 'hearing_aid',
            description: 'İşitme cihazı temini',
            amount: 1200,
            status: 'approved'
          },
          {
            date: '10.01.2024',
            type: 'accessory',
            description: 'Pil paketi temini',
            amount: 180,
            status: 'approved'
          }
        ],
        totalUsed: 1380,
        totalRemaining: 1920
      };

      setPartyRightsData(mockRightsData);
      showSuccess('Başarılı', 'Hasta hakları başarıyla sorgulandı');

    } catch (error: any) {
      const errorMessage = error?.message || 'Hasta hakları sorgulanırken hata oluştu';
      showError('Hata', errorMessage);
    } finally {
      setIsQueryingRights(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Shield className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
        Hasta Hakları Sorgulama
      </h3>

      <Button
        onClick={handleReportQuery}
        disabled={isQueryingRights}
        variant="outline"
        className="w-full mb-4"
      >
        {isQueryingRights ? (
          <>
            <LoadingSpinner size="sm" />
            <span className="ml-2">Haklar Sorgulanıyor...</span>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Hasta Haklarını Sorgula
          </>
        )}
      </Button>

      {partyRightsData && (
        <div className="space-y-6">
          {/* Party Info */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-3">Hasta Bilgileri</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-purple-800 dark:text-purple-200">Hasta Adı:</span>
                <p className="text-purple-700 dark:text-purple-300">{partyRightsData.partyName}</p>
              </div>
              <div>
                <span className="font-medium text-purple-800 dark:text-purple-200">SGK No:</span>
                <p className="text-purple-700 dark:text-purple-300">{partyRightsData.sgkNo}</p>
              </div>
              <div>
                <span className="font-medium text-purple-800 dark:text-purple-200">Geçerlilik:</span>
                <p className="text-purple-700 dark:text-purple-300">{partyRightsData.validityPeriod.startDate} - {partyRightsData.validityPeriod.endDate}</p>
              </div>
              <div>
                <span className="font-medium text-purple-800 dark:text-purple-200">Kalan Gün:</span>
                <p className="text-purple-700 dark:text-purple-300">{partyRightsData.validityPeriod.remainingDays} gün</p>
              </div>
            </div>
          </div>

          {/* Coverage Details */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Hak Detayları</h4>
            <div className="space-y-3">
              {Object.entries(partyRightsData.coverage).map(([key, coverage]: [string, any]) => (
                <div key={key} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white capitalize">
                      {key === 'hearingAid' ? 'İşitme Cihazı' :
                        key === 'accessories' ? 'Aksesuarlar' :
                          key === 'maintenance' ? 'Bakım' : key}
                    </h5>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Son Güncelleme: {coverage.lastUpdate}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Karşılama:</span>
                      <p className="font-medium dark:text-white">{coverage.percentage}%</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Maksimum:</span>
                      <p className="font-medium dark:text-white">₺{coverage.maxAmount}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Kullanılan:</span>
                      <p className="font-medium dark:text-white">₺{coverage.usedAmount}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Kalan:</span>
                      <p className="font-medium text-green-600 dark:text-green-400">₺{coverage.remainingAmount}</p>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(coverage.usedAmount / coverage.maxAmount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Son Hareketler</h4>
            <div className="space-y-2">
              {partyRightsData.recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{activity.description}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium dark:text-white">₺{activity.amount}</p>
                    <Badge className={activity.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}>
                      {activity.status === 'approved' ? 'Onaylandı' : 'Beklemede'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Toplam Hak Özeti</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-700 dark:text-green-300">Toplam Kullanılan:</span>
                <p className="text-lg font-semibold text-green-900 dark:text-green-100">₺{partyRightsData.totalUsed}</p>
              </div>
              <div>
                <span className="text-green-700 dark:text-green-300">Toplam Kalan:</span>
                <p className="text-lg font-semibold text-green-900 dark:text-green-100">₺{partyRightsData.totalRemaining}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};