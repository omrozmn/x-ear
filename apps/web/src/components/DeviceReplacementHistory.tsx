import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button
} from '@x-ear/ui-web';
import {
  History,
  ArrowRight,
  Calendar,
  User,
  FileText,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { DeviceReplacementHistory as ReplacementHistory } from '../types/device-replacement';
import { deviceReplacementService } from '../services/device-replacement.service';

interface DeviceReplacementHistoryProps {
  partyId: string;
  className?: string;
}

export const DeviceReplacementHistory: React.FC<DeviceReplacementHistoryProps> = ({
  partyId,
  className
}) => {
  const [replacements, setReplacements] = useState<ReplacementHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReplacements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await deviceReplacementService.getPartyReplacements(partyId);
      setReplacements(data);
    } catch (err) {
      setError('Cihaz değişim geçmişi yüklenirken hata oluştu');
      console.error('Error loading replacements:', err);
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    loadReplacements();
  }, [loadReplacements]);

  // Listen for global replacement created events to refresh list
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail;
        // If event contains party info, only reload when it matches
        if (!detail || !detail.party_id || detail.party_id === partyId) {
          loadReplacements();
        }
      } catch (err) {
        loadReplacements();
      }
    };

    window.addEventListener('replacement:created', handler as EventListener);
    return () => window.removeEventListener('replacement:created', handler as EventListener);
  }, [partyId, loadReplacements]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending_invoice':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'pending_invoice':
        return 'Fatura Bekliyor';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return 'İşlemde';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending_invoice':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const handleViewInvoice = (replacement: ReplacementHistory) => {
    if (replacement.returnInvoiceId) {
      // Open invoice modal or navigate to invoice page
      console.log('View invoice:', replacement.returnInvoiceId);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Cihaz Değişim Geçmişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Cihaz Değişim Geçmişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="h-6 w-6" />
            <span className="ml-2">{error}</span>
          </div>
          <Button
            onClick={loadReplacements}
            variant="outline"
            className="w-full mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Cihaz Değişim Geçmişi
          <Badge variant="secondary" className="ml-auto">
            {replacements.length} kayıt
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {replacements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Henüz cihaz değişimi yapılmamış</p>
          </div>
        ) : (
          <div className="space-y-4">
            {replacements.map((replacement, index) => (
              <div key={replacement.id} className="relative">
                {index < replacements.length - 1 && (
                  <div className="absolute left-6 top-16 bottom-0 w-px bg-border" />
                )}

                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(replacement.status)}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getStatusVariant(replacement.status)}>
                            {getStatusLabel(replacement.status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {replacement.replacementReason && `• ${replacement.replacementReason}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(replacement.createdAt).toLocaleDateString('tr-TR')}
                          {replacement.replacedBy && (
                            <>
                              <User className="h-3 w-3 ml-2" />
                              {replacement.replacedBy}
                            </>
                          )}
                        </div>
                      </div>

                      {replacement.returnInvoiceId && (
                        <Button
                          variant="ghost"
                          onClick={() => handleViewInvoice(replacement)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Fatura
                        </Button>
                      )}
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Eski Cihaz</div>
                          <div className="text-xs text-muted-foreground">
                            {replacement.oldDeviceInfo.brand} {replacement.oldDeviceInfo.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            SN: {replacement.oldDeviceInfo.serialNumber}
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mx-3" />

                        <div className="space-y-1">
                          <div className="text-sm font-medium">Yeni Cihaz</div>
                          <div className="text-xs text-muted-foreground">
                            {replacement.newDeviceInfo.brand} {replacement.newDeviceInfo.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            SN: {replacement.newDeviceInfo.serialNumber}
                          </div>
                        </div>
                      </div>

                      {replacement.priceDifference !== 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            Fiyat Farkı:
                            <span className={`ml-1 font-medium ${(replacement.priceDifference || 0) > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {(replacement.priceDifference || 0) > 0 ? '+' : ''}
                              {(replacement.priceDifference || 0).toLocaleString('tr-TR')} ₺
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {replacement.notes && (
                      <div className="text-sm text-muted-foreground bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                        <FileText className="h-3 w-3 inline mr-1" />
                        {replacement.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t my-4" />

        <Button
          onClick={loadReplacements}
          variant="ghost"
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </CardContent>
    </Card>
  );
};

export default DeviceReplacementHistory;