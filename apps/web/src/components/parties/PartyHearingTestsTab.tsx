import React from 'react';
import { Button, Badge } from '@x-ear/ui-web';
import { Activity, AlertCircle, Calendar, User } from 'lucide-react';

interface PartyHearingTestsTabProps {
  partyId: string;
}

export const PartyHearingTestsTab: React.FC<PartyHearingTestsTabProps> = ({
  partyId,
}) => {
  // Mock data for now - will be replaced with actual hook
  const hearingTests: Record<string, unknown>[] = [];
  const isLoading = false;
  const error = null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">İşitme testleri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Hata Oluştu</h3>
        <p className="text-gray-500">İşitme testleri yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  const totalTests = hearingTests?.length || 0;
  const recentTests = hearingTests?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
              <p className="text-sm text-gray-500">Toplam Test</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {hearingTests?.filter((test: Record<string, unknown>) => test.status === 'completed').length || 0}
              </p>
              <p className="text-sm text-gray-500">Tamamlanan</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <User className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(hearingTests?.map((test: Record<string, unknown>) => test.conducted_by)).size || 0}
              </p>
              <p className="text-sm text-gray-500">Doktor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tests */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Son İşitme Testleri</h3>
        </div>
        <div className="p-6">
          {recentTests.length > 0 ? (
            <div className="space-y-4">
              {recentTests.map((test: Record<string, unknown>) => (
                <div key={test.id as string} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {test.test_type as string} Testi
                      </h4>
                      <p className="text-sm text-gray-500">
                        {new Date(test.test_date as string).toLocaleDateString('tr-TR')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Dr. {test.conducted_by as string}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={test.status === 'completed' ? 'default' : 'secondary'}>
                      {test.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                    </Badge>
                    {test.results ? (
                      <Button variant="secondary" size="sm">
                        Sonuçları Görüntüle
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Henüz hiç işitme testi bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};