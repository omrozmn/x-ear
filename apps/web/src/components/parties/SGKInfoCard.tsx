import React from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { Shield, CheckCircle, AlertCircle, Clock, Search } from 'lucide-react';

interface SGKInfoCardProps {
  sgkPartyInfo: {
    hasInsurance: boolean;
    deviceEntitlement?: {
      remainingQuantity: number;
      maxQuantity: number;
      validUntil: string;
    };
    batteryEntitlement?: {
      remainingQuantity: number;
      maxQuantity: number;
      validUntil: string;
    };
  } | null;
  sgkLoading: boolean;
  sgkCoverageCalculation: {
    totalCoverage: number;
    partyPayment: number;
    deviceCoverage?: {
      maxCoverage: number;
      coveragePercentage: number;
      remainingEntitlement: number;
    } | null;
    batteryCoverage?: {
      maxCoverage: number;
      coveragePercentage: number;
      remainingEntitlement: number;
    } | null;
    totalCoveragePercentage?: number;
  } | null;
  onQueryPartyRights: () => void;
}

export const SGKInfoCard: React.FC<SGKInfoCardProps> = ({
  sgkPartyInfo,
  sgkLoading,
  sgkCoverageCalculation,
  onQueryPartyRights
}) => {
  if (!sgkPartyInfo) return null;

  return (
    <Card className="border-blue-200 bg-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-blue-800">
            <Shield className="w-5 h-5 mr-2" />
            SGK Bilgileri
          </CardTitle>
          <Button 
            onClick={onQueryPartyRights}
            disabled={sgkLoading}
            size="sm"
            variant="outline"
            className="border-blue-300 text-primary hover:bg-primary/10"
          >
            {sgkLoading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Hakları Sorgula
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Sigorta Durumu</p>
            <div className="flex items-center mt-1">
              {sgkPartyInfo.hasInsurance ? (
                <>
                  <CheckCircle className="w-4 h-4 text-success mr-1" />
                  <span className="text-success font-medium">Aktif</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-destructive mr-1" />
                  <span className="text-destructive font-medium">Pasif</span>
                </>
              )}
            </div>
          </div>
          
          {sgkPartyInfo.deviceEntitlement && (
            <div>
              <p className="text-sm font-medium text-primary">Cihaz Hakkı</p>
              <p className="text-sm text-muted-foreground">
                Kalan: {sgkPartyInfo.deviceEntitlement.remainingQuantity} / {sgkPartyInfo.deviceEntitlement.maxQuantity}
              </p>
              <p className="text-xs text-muted-foreground">
                Geçerlilik: {new Date(sgkPartyInfo.deviceEntitlement.validUntil).toLocaleDateString('tr-TR')}
              </p>
            </div>
          )}
          
          {sgkPartyInfo.batteryEntitlement && (
            <div>
              <p className="text-sm font-medium text-primary">Pil Hakkı</p>
              <p className="text-sm text-muted-foreground">
                Kalan: {sgkPartyInfo.batteryEntitlement.remainingQuantity} / {sgkPartyInfo.batteryEntitlement.maxQuantity}
              </p>
              <p className="text-xs text-muted-foreground">
                Geçerlilik: {new Date(sgkPartyInfo.batteryEntitlement.validUntil).toLocaleDateString('tr-TR')}
              </p>
            </div>
          )}
        </div>
        
        {sgkCoverageCalculation && (
          <div className="mt-4 p-3 bg-card rounded-2xl border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">SGK Kapsam Hesaplaması</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {sgkCoverageCalculation.deviceCoverage && (
                <div>
                  <p className="font-medium text-foreground">Cihaz Kapsamı</p>
                  <p className="text-muted-foreground">
                    Maksimum: ₺{sgkCoverageCalculation.deviceCoverage.maxCoverage.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground">
                    Kapsam Oranı: %{sgkCoverageCalculation.deviceCoverage.coveragePercentage}
                  </p>
                </div>
              )}
              {sgkCoverageCalculation.batteryCoverage && (
                <div>
                  <p className="font-medium text-foreground">Pil Kapsamı</p>
                  <p className="text-muted-foreground">
                    Maksimum: ₺{sgkCoverageCalculation.batteryCoverage.maxCoverage.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground">
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