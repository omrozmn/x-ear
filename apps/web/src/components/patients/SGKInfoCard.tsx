import React from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { Shield, CheckCircle, AlertCircle, Clock, Search } from 'lucide-react';

interface SGKInfoCardProps {
  sgkPatientInfo: any;
  sgkLoading: boolean;
  sgkCoverageCalculation: any;
  onQueryPatientRights: () => void;
}

export const SGKInfoCard: React.FC<SGKInfoCardProps> = ({
  sgkPatientInfo,
  sgkLoading,
  sgkCoverageCalculation,
  onQueryPatientRights
}) => {
  if (!sgkPatientInfo) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-blue-800">
            <Shield className="w-5 h-5 mr-2" />
            SGK Bilgileri
          </CardTitle>
          <Button 
            onClick={onQueryPatientRights}
            disabled={sgkLoading}
            size="sm"
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            {sgkLoading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Hakları Sorgula
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Sigorta Durumu</p>
            <div className="flex items-center mt-1">
              {sgkPatientInfo.hasInsurance ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-700 font-medium">Aktif</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600 mr-1" />
                  <span className="text-red-700 font-medium">Pasif</span>
                </>
              )}
            </div>
          </div>
          
          {sgkPatientInfo.deviceEntitlement && (
            <div>
              <p className="text-sm font-medium text-blue-700">Cihaz Hakkı</p>
              <p className="text-sm text-gray-600">
                Kalan: {sgkPatientInfo.deviceEntitlement.remainingQuantity} / {sgkPatientInfo.deviceEntitlement.maxQuantity}
              </p>
              <p className="text-xs text-gray-500">
                Geçerlilik: {new Date(sgkPatientInfo.deviceEntitlement.validUntil).toLocaleDateString('tr-TR')}
              </p>
            </div>
          )}
          
          {sgkPatientInfo.batteryEntitlement && (
            <div>
              <p className="text-sm font-medium text-blue-700">Pil Hakkı</p>
              <p className="text-sm text-gray-600">
                Kalan: {sgkPatientInfo.batteryEntitlement.remainingQuantity} / {sgkPatientInfo.batteryEntitlement.maxQuantity}
              </p>
              <p className="text-xs text-gray-500">
                Geçerlilik: {new Date(sgkPatientInfo.batteryEntitlement.validUntil).toLocaleDateString('tr-TR')}
              </p>
            </div>
          )}
        </div>
        
        {sgkCoverageCalculation && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">SGK Kapsam Hesaplaması</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {sgkCoverageCalculation.deviceCoverage && (
                <div>
                  <p className="font-medium text-gray-700">Cihaz Kapsamı</p>
                  <p className="text-gray-600">
                    Maksimum: ₺{sgkCoverageCalculation.deviceCoverage.maxCoverage.toLocaleString()}
                  </p>
                  <p className="text-gray-600">
                    Kapsam Oranı: %{sgkCoverageCalculation.deviceCoverage.coveragePercentage}
                  </p>
                </div>
              )}
              {sgkCoverageCalculation.batteryCoverage && (
                <div>
                  <p className="font-medium text-gray-700">Pil Kapsamı</p>
                  <p className="text-gray-600">
                    Maksimum: ₺{sgkCoverageCalculation.batteryCoverage.maxCoverage.toLocaleString()}
                  </p>
                  <p className="text-gray-600">
                    Kapsam Oranı: %{sgkCoverageCalculation.batteryCoverage.coveragePercentage}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};