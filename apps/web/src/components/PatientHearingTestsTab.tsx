import React from 'react';
import { usePatientHearingTests } from '../hooks/patient/usePatientHearingTests';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { Activity, AlertCircle } from 'lucide-react';

interface PatientHearingTestsTabProps {
  patientId: string;
}

export const PatientHearingTestsTab: React.FC<PatientHearingTestsTabProps> = ({
  patientId
}) => {
  const { hearingTests, isLoading: testsLoading, error: testsError } = usePatientHearingTests(patientId);

  if (testsLoading) {
    return (
      <div className="p-6" role="status" aria-label="İşitme testleri yükleniyor">
        <LoadingSkeleton lines={4} className="mb-4" />
        <div className="grid gap-4">
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (testsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">İşitme testleri yüklenirken hata oluştu</h3>
              <p className="mt-1 text-sm text-red-700">
                {typeof testsError === 'string' ? testsError : testsError.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2" aria-hidden="true" />
          İşitme Testleri ({hearingTests.length})
        </h3>
      </div>

      {hearingTests.length === 0 ? (
        <div className="text-center py-12" role="status">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz test yok</h3>
          <p className="text-gray-500">
            Bu hastaya henüz işitme testi uygulanmamış.
          </p>
        </div>
      ) : (
        <div className="grid gap-4" role="list" aria-label="Hasta işitme testleri listesi">
          {hearingTests.map((test) => (
            <div key={test.id} role="listitem" className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-purple-500" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {test.testType} - {formatDate(test.testDate)}
                    </h4>
                    {test.conductedBy && (
                      <p className="text-sm text-gray-500">
                        Test eden: {test.conductedBy}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {test.notes && (
                <p className="mt-2 text-sm text-gray-600">{test.notes}</p>
              )}
              {test.results && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Test sonuçları mevcut</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};